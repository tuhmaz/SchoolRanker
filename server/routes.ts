import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import { z } from "zod";
import { storage, verifyPassword } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";
import { generateMainGradebook, type MainGradebookPayload } from "./exportMainGradebook";
import {
  generateCertificateWorkbook,
  type CertificateExportPayload,
} from "./exportCertificate";
import { generateAttendanceWorkbook, type AttendancePayload } from "./exportAttendance";
import { generatePerformanceCover, type PerformanceCoverPayload } from "./exportPerformanceCover";
import {
  generateLessonAttendanceWorkbook,
  type LessonAttendancePayload,
} from "./exportLessonAttendance";
import { generateScheduleWorkbook, type ScheduleExportPayload } from "./exportSchedule";

// keep a map of generated files for download by id (memory-only)
const exportFiles = new Map<string, string>();

type ExportHistoryEntry = {
  id: string;
  filename: string;
  kind: string;
  createdAt: string;
};

const exportHistoryByUserId = new Map<string, ExportHistoryEntry[]>();

const recordExportForUser = (userId: string, entry: ExportHistoryEntry) => {
  const existing = exportHistoryByUserId.get(userId) ?? [];
  exportHistoryByUserId.set(userId, [entry, ...existing].slice(0, 100));
};

const removeExportFromUserHistory = (userId: string, exportId: string) => {
  const existing = exportHistoryByUserId.get(userId);
  if (!existing) return;
  exportHistoryByUserId.set(userId, existing.filter((entry) => entry.id !== exportId));
};

// Helper to get current directory with fallback
const getCurrentDir = () => {
  if (typeof import.meta.dirname !== 'undefined') {
    return import.meta.dirname;
  }
  // Fallback for environments where import.meta.dirname is not available
  return dirname(fileURLToPath(import.meta.url));
};

const resolveTemplatePath = (filename: string) => {
  const projectRoot = path.resolve(getCurrentDir(), "..");
  const candidates: string[] = [
    path.resolve(projectRoot, "templates", filename),
    path.resolve(projectRoot, filename),
    path.resolve(projectRoot, "dist", "templates", filename),
  ];
  const cwd = process.cwd();
  if (cwd && cwd !== projectRoot) {
    candidates.push(path.resolve(cwd, "templates", filename));
    candidates.push(path.resolve(cwd, filename));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const sendExportAndCleanup = (res: Response, id: string, exportPath: string) => {
  res.download(exportPath, path.basename(exportPath), (err) => {
    if (!err) {
      fs.promises.unlink(exportPath).catch(() => {});
    }
    exportFiles.delete(id);
  });
};

const normalizeLabel = (value: unknown, fallback = "") => {
  const text = value != null ? String(value).trim() : "";
  return text.length > 0 ? text : fallback;
};

const sanitizeSheetName = (base: string) => {
  const cleaned = base
    .replace(/[\\/*?:\\[\\]]+/g, " ")
    .replace(/\s* - \s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
};

const isProd = (process.env.NODE_ENV ?? "development") === "production";

const resolveSessionSecret = () => {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  if (isProd) throw new Error("SESSION_SECRET is required in production");
  return nanoid(32);
};

const MemoryStore = createMemoryStore(session);

const buildSessionMiddleware = () =>
  session({
    name: "khadmatak.sid",
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });

const usernameSchema = z.string().trim().min(3).max(64);
const passwordSchema = z.string().min(8).max(200);

const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().min(2).max(200),
});

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200),
});

const adminCreateUserSchema = registerSchema.extend({
  role: z.enum(["admin", "teacher"]),
});

const teacherRecordsStudentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  class: z.string().trim().min(1),
  division: z.string().trim().min(1),
  nationalId: z.string().optional(),
  birthDate: z.string().optional(),
  status: z.string().optional(),
});

const teacherRecordsClassSchema = z.object({
  className: z.string().trim().min(1),
  divisions: z.array(
    z.object({
      id: z.string().min(1),
      division: z.string().trim().min(1),
      subjects: z
        .array(
          z.object({
            id: z.string().min(1),
            name: z.string(),
          }),
        )
        .optional()
        .default([]),
    }),
  ),
});

const teacherRecordsUpsertSchema = z
  .object({
    teacherName: z.string().optional(),
    directorate: z.string().optional(),
    school: z.string().optional(),
    town: z.string().optional(),
    program: z.string().optional(),
    year: z.string().optional(),
    isHomeroom: z.boolean().optional(),
    homeroomClass: z.string().optional(),
    schoolInfo: z
      .object({
        directorate: z.string(),
        school: z.string(),
        program: z.string(),
      })
      .optional(),
    students: z.array(teacherRecordsStudentSchema).optional().default([]),
    classes: z.array(teacherRecordsClassSchema).optional().default([]),
    source: z.string().optional(),
  })
  .strict();

const optionalMarkSchema = z
  .preprocess((value) => {
    if (value == null) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
      return value;
    }
    return value;
  }, z.union([z.number().min(0).max(100), z.null()]))
  .optional();

const optionalTrimmedNoteSchema = z
  .preprocess((value) => {
    if (value == null) return value;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }, z.union([z.string(), z.null()]))
  .optional();

const sideGradebookStudentGradesSchema = z
  .object({
    t1Eval1: optionalMarkSchema,
    t1Eval2: optionalMarkSchema,
    t1Eval3: optionalMarkSchema,
    t1Final: optionalMarkSchema,
    t2Eval1: optionalMarkSchema,
    t2Eval2: optionalMarkSchema,
    t2Eval3: optionalMarkSchema,
    t2Final: optionalMarkSchema,
    note: optionalTrimmedNoteSchema,
    eval1: optionalMarkSchema,
    eval2: optionalMarkSchema,
    eval3: optionalMarkSchema,
    final: optionalMarkSchema,
  })
  .strip();

const sideGradebookUpsertSchema = z
  .object({
    className: z.string().trim().min(1),
    division: z.string().trim().min(1),
    gradesByStudentId: z.record(z.string(), sideGradebookStudentGradesSchema).optional().default({}),
  })
  .strip();

const mainGradebookStudentGradesSchema = z
  .object({
    t1Eval1: z.number().min(0).max(100).nullable().optional(),
    t1Eval2: z.number().min(0).max(100).nullable().optional(),
    t1Eval3: z.number().min(0).max(100).nullable().optional(),
    t1Eval4: z.number().min(0).max(100).nullable().optional(),
    t1Note: z.string().trim().nullable().optional(),
    t2Eval1: z.number().min(0).max(100).nullable().optional(),
    t2Eval2: z.number().min(0).max(100).nullable().optional(),
    t2Eval3: z.number().min(0).max(100).nullable().optional(),
    t2Eval4: z.number().min(0).max(100).nullable().optional(),
    completion: z.number().min(0).max(100).nullable().optional(),
    note: z.string().trim().nullable().optional(),
    eval1: z.number().min(0).max(100).nullable().optional(),
    eval2: z.number().min(0).max(100).nullable().optional(),
    eval3: z.number().min(0).max(100).nullable().optional(),
    final: z.number().min(0).max(100).nullable().optional(),
  })
  .strip();

const mainGradebookUpsertSchema = z
  .object({
    className: z.string().trim().min(1),
    division: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    gradesByStudentId: z.record(z.string().min(1), mainGradebookStudentGradesSchema).optional().default({}),
  })
  .strip();

const attendanceStatusSchema = z.enum(["present", "absent", "excused"]);

const attendanceEntrySchema = z
  .object({
    studentId: z.string().trim().min(1),
    status: attendanceStatusSchema,
  })
  .strip();

const attendanceByDateSchema = z.record(z.string(), z.array(attendanceEntrySchema)).optional().default({});

const dashboardAttendanceUpsertSchema = z
  .object({
    divisionId: z.string().trim().min(1),
    attendanceByDate: attendanceByDateSchema,
  })
  .strip();

const dashboardLessonAttendanceLessonSchema = z
  .object({
    name: z.string().trim().optional().default(""),
    divisionId: z.string().trim().optional().default(""),
    subjectId: z.string().trim().optional(),
    active: z.boolean().optional().default(false),
  })
  .strip();

const dashboardLessonAttendanceSessionSchema = z
  .object({
    name: z.string().trim().optional().default(""),
    divisionId: z.string().trim().optional().default(""),
    subjectId: z.string().trim().optional(),
    presentById: z.record(z.string().trim().min(1), z.boolean()).optional().default({}),
    active: z.boolean().optional().default(false),
  })
  .strip();

const dashboardLessonAttendanceUpsertSchema = z
  .object({
    sessions: z.array(dashboardLessonAttendanceSessionSchema).optional().default([]),
    lessons: z.array(dashboardLessonAttendanceLessonSchema).optional().default([]),
    day: z.string().trim().optional(),
    date: z.string().trim().optional(),
    teacherName: z.string().trim().optional(),
    signature: z.string().trim().optional(),
  })
  .strip();

const dashboardPerformanceFieldTypeSchema = z.enum(["text", "number", "select", "boolean"]);

const dashboardPerformanceFieldSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    type: dashboardPerformanceFieldTypeSchema,
    options: z.array(z.string().trim()).optional(),
  })
  .strip();

const dashboardPerformanceTemplateSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    fields: z.array(dashboardPerformanceFieldSchema).optional().default([]),
    updatedAt: z.string().trim().optional(),
  })
  .strip();

const dashboardPerformanceValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const dashboardPerformanceArchiveSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    divisionId: z.string().trim().min(1),
    subjectId: z.string().trim().optional(),
    templateId: z.string().trim().optional(),
    term: z.string().trim().optional(),
    date: z.string().trim().optional(),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().optional(),
    valuesByStudentId: z
      .record(z.string().trim().min(1), z.record(z.string().trim().min(1), dashboardPerformanceValueSchema))
      .optional()
      .default({}),
    notesByStudentId: z.record(z.string().trim().min(1), z.string()).optional().default({}),
  })
  .strip();

const dashboardPerformanceUpsertSchema = z
  .object({
    templates: z.array(dashboardPerformanceTemplateSchema).optional().default([]),
    archives: z.array(dashboardPerformanceArchiveSchema).optional().default([]),
    activeArchiveId: z.string().trim().optional(),
  })
  .strip();

const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const getRateLimitKey = (req: Request, username: string) => `${req.ip}|${username}`;

const isRateLimited = (key: string) => {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  const age = Date.now() - entry.firstAt;
  if (age > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
};

const recordFailedLogin = (key: string) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }

  const age = now - entry.firstAt;
  if (age > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }

  entry.count += 1;
};

const clearLoginFailures = (key: string) => {
  loginAttempts.delete(key);
};

const setSessionUserId = (req: Request, userId: string) => {
  (req.session as any).userId = userId;
};

const regenerateSession = (req: Request) =>
  new Promise<void>((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const clearSessionUserId = (req: Request) => {
  (req.session as any).userId = undefined;
};

const getSessionUserId = (req: Request): string | undefined => {
  const userId = (req.session as any)?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : undefined;
};

const toPublicUser = async (user: { id: string; username: string; name: string; role: string; schoolId: string }) => {
  const school = await storage.getSchool(user.schoolId);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    schoolName: school?.name ?? null,
  };
};

type DashboardRole = "admin" | "teacher";

const getDefaultDashboardPath = (role: DashboardRole) => (role === "admin" ? "/dashboard/admin" : "/dashboard");

const dashboardPages: Array<{ id: string; title: string; path: string; roles: DashboardRole[] }> = [
  { id: "dashboard", title: "لوحة التحكم", path: "/dashboard", roles: ["admin", "teacher"] },
  { id: "exports", title: "سجل التصدير", path: "/dashboard/exports", roles: ["admin", "teacher"] },
  { id: "records", title: "إدارة السجلات", path: "/dashboard/records", roles: ["admin", "teacher"] },
  { id: "settings", title: "الإعدادات", path: "/settings", roles: ["admin", "teacher"] },
  { id: "main-gradebook", title: "دفتر العلامات الرئيسي", path: "/dashboard/main-gradebook", roles: ["admin", "teacher"] },
  { id: "side-gradebook", title: "دفتر العلامات الفرعي", path: "/dashboard/side-gradebook", roles: ["admin", "teacher"] },
  { id: "attendance", title: "الحضور والغياب", path: "/dashboard/attendance", roles: ["admin", "teacher"] },
  { id: "lesson-attendance", title: "حضور الحصص", path: "/dashboard/lesson-attendance", roles: ["admin", "teacher"] },
  { id: "performance", title: "الأداء والملاحظات", path: "/dashboard/performance", roles: ["admin", "teacher"] },
  { id: "schedule", title: "جدول الطلبة", path: "/schedule", roles: ["admin", "teacher"] },
  { id: "templates", title: "القوالب", path: "/templates", roles: ["admin", "teacher"] },
  { id: "tutorials", title: "الشروحات", path: "/tutorials", roles: ["admin", "teacher"] },
  { id: "users", title: "إدارة المستخدمين", path: "/dashboard/admin/users", roles: ["admin"] },
];

const getDashboardBootstrapForUser = async (publicUser: Awaited<ReturnType<typeof toPublicUser>>) => {
  const role: DashboardRole = publicUser.role === "admin" ? "admin" : "teacher";
  const pages = dashboardPages
    .filter((p) => p.roles.includes(role))
    .map(({ roles: _roles, ...page }) => page);

  return {
    path: getDefaultDashboardPath(role),
    role,
    pages,
    permissions: {
      canManageUsers: role === "admin",
      canExport: true,
    },
  };
};

const applyUserContext = async <T extends Record<string, unknown>>(user: any, payload: T) => {
  const school = user?.schoolId ? await storage.getSchool(String(user.schoolId)) : undefined;
  if (school?.name && typeof payload === "object" && payload) {
    if ("school" in payload) {
      (payload as any).school = school.name;
    }
    if ("teacherName" in payload) {
      (payload as any).teacherName = user?.name ?? (payload as any).teacherName;
    }
  }
  return payload;
};

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    const user = await storage.getUser(userId);
    if (!user) {
      clearSessionUserId(req);
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    (res.locals as any).user = user;
    next();
  } catch (e) {
    next(e);
  }
};

const attachUserIfAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      next();
      return;
    }

    const user = await storage.getUser(userId);
    if (user) {
      (res.locals as any).user = user;
    }
    next();
  } catch (e) {
    next(e);
  }
};

const requireRole = (role: "admin" | "teacher") => (req: Request, res: Response, next: NextFunction) => {
  const user = (res.locals as any).user as { role?: string } | undefined;
  if (!user || user.role !== role) {
    res.status(403).json({ message: "forbidden" });
    return;
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const projectRoot = path.resolve(getCurrentDir(), "..");
  const tutorialsDir = path.resolve(projectRoot, "templates", "vedio");
  if (fs.existsSync(tutorialsDir)) {
    app.use(
      "/tutorials/videos",
      express.static(tutorialsDir, {
        setHeaders(res, filePath) {
          if (filePath.endsWith(".mp4")) {
            res.setHeader("Content-Type", "video/mp4");
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        },
      }),
    );
  }

  app.use(buildSessionMiddleware());

  app.use("/api/export", attachUserIfAuthenticated);

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const { username, password, name, schoolName } = parsed.data;
    const userCount = await storage.countUsers();
    const role = userCount === 0 ? "admin" : "teacher";

    try {
      const created = await storage.createUser({
        username,
        password,
        name,
        schoolName,
        role,
      });
      await regenerateSession(req);
      setSessionUserId(req, created.id);
      const publicUser = await toPublicUser(created);
      return res.json({
        ok: true,
        user: publicUser,
        dashboard: await getDashboardBootstrapForUser(publicUser),
        bootstrapAdmin: userCount === 0,
      });
    } catch (e: any) {
      const message = String(e?.message || "failed to create user");
      if (message.includes("username already exists")) {
        return res.status(409).json({ message: "username already exists" });
      }
      return res.status(500).json({ message: "failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const username = parsed.data.username.trim().toLowerCase();
    const key = getRateLimitKey(req, username);
    if (isRateLimited(key)) {
      return res.status(429).json({ message: "too many attempts" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      recordFailedLogin(key);
      return res.status(401).json({ message: "invalid credentials" });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      recordFailedLogin(key);
      return res.status(401).json({ message: "invalid credentials" });
    }

    clearLoginFailures(key);
    await regenerateSession(req);
    setSessionUserId(req, user.id);
    const publicUser = await toPublicUser(user);
    return res.json({ ok: true, user: publicUser, dashboard: await getDashboardBootstrapForUser(publicUser) });
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (!req.session) {
      return res.json({ ok: true });
    }

    clearSessionUserId(req);
    await new Promise<void>((resolve) => {
      req.session.destroy(() => resolve());
    });
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user;
    const publicUser = await toPublicUser(user);
    return res.json({ ok: true, user: publicUser, dashboard: await getDashboardBootstrapForUser(publicUser) });
  });

  app.get("/api/dashboard", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user;
    const publicUser = await toPublicUser(user);
    const dashboard = await getDashboardBootstrapForUser(publicUser);
    const stats = dashboard.role === "admin" ? { usersCount: await storage.countUsers() } : null;

    return res.json({
      ok: true,
      user: publicUser,
      dashboard,
      stats,
      runtime: {
        now: new Date().toISOString(),
        pendingDownloads: exportFiles.size,
      },
    });
  });

  app.get("/api/dashboard/exports", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    const entries = exportHistoryByUserId.get(user.id) ?? [];

    const exports = entries.map((entry) => {
      const exportPath = exportFiles.get(entry.id);
      const available = Boolean(exportPath && fs.existsSync(exportPath));
      const downloadUrl =
        entry.kind === "schedule"
          ? `/api/export/schedule/${encodeURIComponent(entry.id)}`
          : `/api/export/${encodeURIComponent(entry.kind)}?id=${encodeURIComponent(entry.id)}`;

      return { ...entry, available, downloadUrl: available ? downloadUrl : null };
    });

    return res.json({ ok: true, exports });
  });

  app.delete("/api/dashboard/exports/:id", requireAuth, async (req, res) => {
    const user = (res.locals as any).user as { id: string };
    const exportId = String(req.params.id || "");
    removeExportFromUserHistory(user.id, exportId);
    return res.json({ ok: true });
  });

  app.get("/api/dashboard/records", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    return res.json({ ok: true, record: record ? { data: record.data, updatedAt: record.updatedAt } : null });
  });

  app.put("/api/dashboard/records", requireAuth, async (req, res) => {
    const parsed = teacherRecordsUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const user = (res.locals as any).user;
    const syncedAt = new Date().toISOString();
    const data = await applyUserContext(user, { ...parsed.data, syncedAt } as any);
    const stored = await storage.upsertTeacherRecords(String(user.id), data as any);
    return res.json({ ok: true, record: { data: stored.data, updatedAt: stored.updatedAt } });
  });

  app.delete("/api/dashboard/records", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    await storage.clearTeacherRecords(user.id);
    return res.json({ ok: true });
  });

  app.get("/api/dashboard/side-gradebook", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const sideGradebook = (record?.data as any)?.sideGradebook ?? null;
    return res.json({ ok: true, sideGradebook, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/side-gradebook", requireAuth, async (req, res) => {
    const parsed = sideGradebookUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload", issues: parsed.error.issues });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const now = new Date().toISOString();

    const baseData: any = record?.data ?? {
      students: [],
      classes: [],
    };

    if (!Array.isArray(baseData.students)) baseData.students = [];
    if (!Array.isArray(baseData.classes)) baseData.classes = [];

    const normalizedClassName = normalizeLabel(parsed.data.className, "غير محدد");
    const normalizedDivision = normalizeLabel(parsed.data.division, "بدون شعبة");
    const key = `${normalizedClassName}|||${normalizedDivision}`;

    const currentState: any = baseData.sideGradebook && typeof baseData.sideGradebook === "object" ? baseData.sideGradebook : {};
    const byGroup: any = currentState.byGroup && typeof currentState.byGroup === "object" ? currentState.byGroup : {};

    byGroup[key] = {
      className: normalizedClassName,
      division: normalizedDivision,
      gradesByStudentId: parsed.data.gradesByStudentId ?? {},
      updatedAt: now,
    };

    const nextState = {
      ...currentState,
      version: Number(currentState.version ?? 1),
      byGroup,
      updatedAt: now,
    };

    const stored = await storage.upsertTeacherRecords(String(user.id), { ...baseData, sideGradebook: nextState } as any);
    return res.json({ ok: true, sideGradebook: (stored.data as any)?.sideGradebook ?? null, updatedAt: stored.updatedAt });
  });

  app.get("/api/dashboard/main-gradebook", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const mainGradebook = (record?.data as any)?.mainGradebook ?? null;
    return res.json({ ok: true, mainGradebook, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/main-gradebook", requireAuth, async (req, res) => {
    const parsed = mainGradebookUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const now = new Date().toISOString();

    const baseData: any = record?.data ?? {
      students: [],
      classes: [],
    };

    if (!Array.isArray(baseData.students)) baseData.students = [];
    if (!Array.isArray(baseData.classes)) baseData.classes = [];

    const normalizedClassName = normalizeLabel(parsed.data.className, "غير محدد");
    const normalizedDivision = normalizeLabel(parsed.data.division, "بدون شعبة");
    const normalizedSubject = normalizeLabel(parsed.data.subject, "غير محدد");
    const key = `${normalizedClassName}|||${normalizedDivision}|||${normalizedSubject}`;

    const currentState: any = baseData.mainGradebook && typeof baseData.mainGradebook === "object" ? baseData.mainGradebook : {};
    const byGroup: any = currentState.byGroup && typeof currentState.byGroup === "object" ? currentState.byGroup : {};

    byGroup[key] = {
      className: normalizedClassName,
      division: normalizedDivision,
      subject: normalizedSubject,
      gradesByStudentId: parsed.data.gradesByStudentId ?? {},
      updatedAt: now,
    };

    const nextState = {
      ...currentState,
      version: Number(currentState.version ?? 1),
      byGroup,
      updatedAt: now,
    };

    const stored = await storage.upsertTeacherRecords(String(user.id), { ...baseData, mainGradebook: nextState } as any);
    return res.json({ ok: true, mainGradebook: (stored.data as any)?.mainGradebook ?? null, updatedAt: stored.updatedAt });
  });

  app.get("/api/dashboard/attendance", requireAuth, async (req, res) => {
    const user = (res.locals as any).user as { id: string };
    const divisionId = typeof req.query.divisionId === "string" ? req.query.divisionId.trim() : "";
    const record = await storage.getTeacherRecords(user.id);
    const attendance = (record?.data as any)?.attendance ?? null;

    if (!divisionId) {
      return res.json({ ok: true, attendance, updatedAt: record?.updatedAt ?? null });
    }

    const byDivisionId = attendance?.byDivisionId && typeof attendance.byDivisionId === "object" ? attendance.byDivisionId : {};
    return res.json({ ok: true, divisionId, attendanceByDate: byDivisionId[divisionId] ?? {}, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/attendance", requireAuth, async (req, res) => {
    const parsed = dashboardAttendanceUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const now = new Date().toISOString();

    const baseData: any = record?.data ?? {
      students: [],
      classes: [],
    };

    if (!Array.isArray(baseData.students)) baseData.students = [];
    if (!Array.isArray(baseData.classes)) baseData.classes = [];

    const divisionId = parsed.data.divisionId;
    const currentState: any = baseData.attendance && typeof baseData.attendance === "object" ? baseData.attendance : {};
    const byDivisionId: any = currentState.byDivisionId && typeof currentState.byDivisionId === "object" ? currentState.byDivisionId : {};

    byDivisionId[divisionId] = parsed.data.attendanceByDate ?? {};

    const nextState = {
      ...currentState,
      version: Number(currentState.version ?? 1),
      byDivisionId,
      updatedAt: now,
    };

    const stored = await storage.upsertTeacherRecords(String(user.id), { ...baseData, attendance: nextState } as any);
    const storedAttendance = (stored.data as any)?.attendance ?? null;
    const storedByDivisionId =
      storedAttendance?.byDivisionId && typeof storedAttendance.byDivisionId === "object" ? storedAttendance.byDivisionId : {};

    return res.json({
      ok: true,
      divisionId,
      attendanceByDate: storedByDivisionId[divisionId] ?? {},
      updatedAt: stored.updatedAt,
    });
  });

  app.get("/api/dashboard/lesson-attendance", requireAuth, async (req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const lessonAttendance = (record?.data as any)?.lessonAttendance ?? null;
    return res.json({ ok: true, lessonAttendance, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/lesson-attendance", requireAuth, async (req, res) => {
    const parsed = dashboardLessonAttendanceUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const now = new Date().toISOString();

    const baseData: any = record?.data ?? {
      students: [],
      classes: [],
    };

    if (!Array.isArray(baseData.students)) baseData.students = [];
    if (!Array.isArray(baseData.classes)) baseData.classes = [];

    const currentState: any =
      baseData.lessonAttendance && typeof baseData.lessonAttendance === "object" ? baseData.lessonAttendance : {};

    const incomingSessions =
      Array.isArray(parsed.data.sessions) && parsed.data.sessions.length > 0
        ? parsed.data.sessions
        : Array.isArray(parsed.data.lessons) && parsed.data.lessons.length > 0
          ? parsed.data.lessons.map((lesson) => ({ ...lesson, presentById: {} }))
          : [];

    const nextState = {
      ...currentState,
      version: Number(currentState.version ?? 1),
      sessions: incomingSessions,
      day: parsed.data.day ?? currentState.day ?? "",
      date: parsed.data.date ?? currentState.date ?? "",
      teacherName: parsed.data.teacherName,
      signature: parsed.data.signature,
      updatedAt: now,
    };

    const stored = await storage.upsertTeacherRecords(String(user.id), { ...baseData, lessonAttendance: nextState } as any);
    return res.json({ ok: true, lessonAttendance: (stored.data as any)?.lessonAttendance ?? null, updatedAt: stored.updatedAt });
  });

  app.get("/api/dashboard/performance", requireAuth, async (_req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const dashboardPerformance = (record?.data as any)?.dashboardPerformance ?? null;
    return res.json({ ok: true, dashboardPerformance, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/performance", requireAuth, async (req, res) => {
    const parsed = dashboardPerformanceUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const now = new Date().toISOString();

    const baseData: any = record?.data ?? {
      students: [],
      classes: [],
    };

    if (!Array.isArray(baseData.students)) baseData.students = [];
    if (!Array.isArray(baseData.classes)) baseData.classes = [];

    const currentState: any =
      baseData.dashboardPerformance && typeof baseData.dashboardPerformance === "object" ? baseData.dashboardPerformance : {};

    const nextState = {
      ...currentState,
      version: Number(currentState.version ?? 1),
      templates: parsed.data.templates ?? [],
      archives: parsed.data.archives ?? [],
      activeArchiveId: parsed.data.activeArchiveId,
      updatedAt: now,
    };

    const stored = await storage.upsertTeacherRecords(String(user.id), { ...baseData, dashboardPerformance: nextState } as any);
    return res.json({
      ok: true,
      dashboardPerformance: (stored.data as any)?.dashboardPerformance ?? null,
      updatedAt: stored.updatedAt,
    });
  });

  const performanceRecordUpsertSchema = z.object({
    id: z.string().trim().optional(),
    className: z.string().trim().min(1),
    divisionId: z.string().trim().min(1),
    studentId: z.string().trim().min(1),
    evaluationDate: z.string().trim().min(1),
    academicTerm: z.string().trim().min(1),
    performanceScores: z.object({
      academic: z.number().min(0).max(100),
      behavioral: z.number().min(0).max(100),
      participation: z.number().min(0).max(100),
    }),
    notes: z.array(z.string().trim()).optional().default([]),
    attachments: z.array(z.string().trim()).optional().default([]),
    archived: z.boolean().optional().default(false),
  });

  app.get("/api/dashboard/performance-records", requireAuth, async (req, res) => {
    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const performanceRecords = (record?.data as any)?.performanceRecords ?? [];
    return res.json({ ok: true, performanceRecords, updatedAt: record?.updatedAt ?? null });
  });

  app.put("/api/dashboard/performance-records", requireAuth, async (req, res) => {
    const parsed = performanceRecordUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload", issues: parsed.error.issues });
    }

    const user = (res.locals as any).user as { id: string };
    const record = await storage.getTeacherRecords(user.id);
    const baseData: any = record?.data ?? { students: [], classes: [], performanceRecords: [] };
    
    if (!Array.isArray(baseData.performanceRecords)) baseData.performanceRecords = [];

    const now = new Date().toISOString();
    let newRecord = {
      ...parsed.data,
      updatedAt: now,
    };

    if (newRecord.id) {
        // Update existing
        const index = baseData.performanceRecords.findIndex((r: any) => r.id === newRecord.id);
        if (index !== -1) {
             // Preserve original fields if needed, here just merge
             const existing = baseData.performanceRecords[index];
             baseData.performanceRecords[index] = { 
                ...existing, 
                ...newRecord,
                // Ensure we don't overwrite creation date if we had one (not in schema currently but good practice)
             };
        } else {
             baseData.performanceRecords.push(newRecord);
        }
    } else {
        // Create new
        newRecord.id = nanoid();
        // Initial version
        (newRecord as any).version = 1;
        baseData.performanceRecords.push(newRecord);
    }

    const stored = await storage.upsertTeacherRecords(String(user.id), baseData as any);
    return res.json({ ok: true, performanceRecords: (stored.data as any)?.performanceRecords ?? [] });
  });

  app.delete("/api/dashboard/performance-records/:id", requireAuth, async (req, res) => {
    const user = (res.locals as any).user as { id: string };
    const recordId = req.params.id;
    const record = await storage.getTeacherRecords(user.id);
    const baseData: any = record?.data ?? { students: [], classes: [], performanceRecords: [] };
    
    if (Array.isArray(baseData.performanceRecords)) {
        baseData.performanceRecords = baseData.performanceRecords.filter(
          (pr: any) => pr.id !== recordId
        );
    }
    
    const stored = await storage.upsertTeacherRecords(String(user.id), baseData as any);
    return res.json({ ok: true, performanceRecords: (stored.data as any)?.performanceRecords ?? [] });
  });

  app.get("/api/auth/users", requireAuth, requireRole("admin"), async (_req, res) => {
    const all = await storage.listUsers();
    const users = await Promise.all(all.map((u) => toPublicUser(u)));
    return res.json({ ok: true, users });
  });

  app.post("/api/auth/users", requireAuth, requireRole("admin"), async (req, res) => {
    const parsed = adminCreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid payload" });
    }

    try {
      const created = await storage.createUser(parsed.data);
      return res.json({ ok: true, user: await toPublicUser(created) });
    } catch (e: any) {
      const message = String(e?.message || "failed to create user");
      if (message.includes("username already exists")) {
        return res.status(409).json({ message: "username already exists" });
      }
      return res.status(500).json({ message: "failed to create user" });
    }
  });

  app.post("/api/export/main-gradebook", async (req, res) => {
    try {
      const payload = req.body as MainGradebookPayload;
      const user = (res.locals as any).user;
      await applyUserContext(user, payload as any);
      const result = await generateMainGradebook(payload);
      exportFiles.set(result.id, result.exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "main-gradebook",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export main gradebook" });
    }
  });

  app.post("/api/export/certificate", async (req, res) => {
    try {
      const payload = req.body as CertificateExportPayload;
      if (!payload || !Array.isArray(payload.students) || payload.students.length === 0) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const result = await generateCertificateWorkbook(payload);
      exportFiles.set(result.id, result.exportPath);
      const user = (res.locals as any).user;
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "certificate",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename, count: result.studentCount });
    } catch (e: any) {
      console.error("[routes] Error exporting certificates:", e);
      return res.status(500).json({ message: e?.message || "failed to export certificates" });
    }
  });

  app.post("/api/export/lesson-attendance", async (req, res) => {
    try {
      const payload = req.body as LessonAttendancePayload;
      if (!payload) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const user = (res.locals as any).user;
      await applyUserContext(user, payload as any);
      const result = await generateLessonAttendanceWorkbook(payload);
      exportFiles.set(result.id, result.exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "lesson-attendance",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      console.error("[routes] Error exporting lesson attendance:", e);
      return res
        .status(500)
        .json({ message: e?.message || "failed to export lesson attendance" });
    }
  });

  app.post("/api/export/performance-cover", async (req, res) => {
    try {
      const payload = req.body as PerformanceCoverPayload;
      if (!payload) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const user = (res.locals as any).user;
      await applyUserContext(user, payload as any);
      const result = await generatePerformanceCover(payload);
      exportFiles.set(result.id, result.exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "performance-cover",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export cover" });
    }
  });

  app.post("/api/export/attendance", async (req, res) => {
    try {
      console.log("[routes] Received attendance export request");
      const payload = req.body as AttendancePayload;
      const user = (res.locals as any).user;
      await applyUserContext(user, payload as any);
      console.log("[routes] Payload:", JSON.stringify({ 
        month: payload.month, 
        year: payload.year,
        classCount: payload.classes?.length,
        studentCount: payload.students?.length,
        attendanceCount: payload.attendance?.length
      }));
      
      const result = await generateAttendanceWorkbook(payload);
      console.log("[routes] Attendance workbook generated successfully:", result.filename);
      
      exportFiles.set(result.id, result.exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "attendance",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      console.error("[routes] Error exporting attendance:", e);
      console.error("[routes] Error stack:", e?.stack);
      return res.status(500).json({ message: e?.message || "failed to export attendance" });
    }
  });

  // Generate Side Gradebook Excel at project root mark_s.xlsx
  app.post("/api/export/side-gradebook", async (req, res) => {
    try {
      const body = req.body as {
        school?: string;
        directorate?: string;
        program?: string;
        teacherName?: string;
        town?: string;
        year?: string;
        isHomeroom?: boolean;
        homeroomClass?: string;
        classes: { className: string; divisions: { id: string; division: string; subjects: { id: string; name: string }[] }[] }[];
        students: { id: string; name: string; class: string; division: string; nationalId?: string }[];
        gradebook?: {
          byGroup?: Record<
            string,
            {
              className?: string;
              division?: string;
              gradesByStudentId?: Record<
                string,
                {
                  t1Eval1?: number | null;
                  t1Eval2?: number | null;
                  t1Eval3?: number | null;
                  t1Final?: number | null;
                  t2Eval1?: number | null;
                  t2Eval2?: number | null;
                  t2Eval3?: number | null;
                  t2Final?: number | null;
                  note?: string | null;
                  eval1?: number | null;
                  eval2?: number | null;
                  eval3?: number | null;
                  final?: number | null;
                }
              >;
            }
          >;
        };
      };

      if (!body || !Array.isArray(body.classes) || !Array.isArray(body.students)) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const user = (res.locals as any).user;
      await applyUserContext(user, body as any);

      const projectRoot = path.resolve(getCurrentDir(), "..");
      const templatePath = resolveTemplatePath("mark_s.xlsx");
      if (!templatePath) {
        return res.status(500).json({ message: "قالب mark_s.xlsx غير متوفر على الخادم" });
      }
      const exportsDir = path.resolve(projectRoot, "exports");
      await fs.promises.mkdir(exportsDir, { recursive: true });

      let templateWorkbook = new ExcelJS.Workbook();
      let templateSheet: ExcelJS.Worksheet | null = null;
      try {
        await templateWorkbook.xlsx.readFile(templatePath);
        templateSheet = templateWorkbook.worksheets[0] ?? null;
      } catch (error) {
        return res.status(500).json({ message: "تعذر قراءة قالب mark_s.xlsx" });
      }

      if (!templateSheet) {
        return res.status(500).json({ message: "تعذر تحديد ورقة العمل من قالب mark_s.xlsx" });
      }

      const cloneWorksheet = (source: ExcelJS.Worksheet, target: ExcelJS.Workbook, name: string) => {
        const worksheet = target.addWorksheet(name, {
          properties: { ...source.properties },
          pageSetup: { ...source.pageSetup },
          views: source.views?.map((view) => ({ ...view })) ?? undefined,
        });

        if (source.columns?.length) {
          worksheet.columns = source.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width,
            hidden: column.hidden,
            outlineLevel: column.outlineLevel,
            style: column.style ? { ...column.style } : undefined,
          }));
        }

        source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const targetRow = worksheet.getRow(rowNumber);
          targetRow.height = row.height;
          targetRow.outlineLevel = row.outlineLevel;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber);
            const rawValue = cell.value as any;
            if (rawValue && typeof rawValue === "object" && (rawValue.formula || rawValue.sharedFormula || rawValue.formulaType)) {
              targetCell.value = rawValue.result ?? rawValue.text ?? null;
            } else {
              targetCell.value = cell.value;
            }
            if (cell.style) targetCell.style = { ...cell.style };
            if (cell.alignment) targetCell.alignment = { ...cell.alignment };
            if (cell.font) targetCell.font = { ...cell.font };
            if (cell.border) targetCell.border = { ...cell.border };
            if (cell.fill) targetCell.fill = { ...cell.fill };
            if (cell.numFmt) targetCell.numFmt = cell.numFmt;
          });
        });

        const merges = ((source as unknown as { model?: { merges?: string[] } }).model?.merges) ?? [];
        merges.forEach((mergeRef) => {
          worksheet.mergeCells(mergeRef);
        });

        return worksheet;
      };

      const cellValueToString = (value: ExcelJS.CellValue | undefined): string | undefined => {
        if (value == null) return undefined;
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") {
          const anyValue = value as any;
          if (Array.isArray(anyValue.richText)) {
            return anyValue.richText.map((part: any) => part?.text ?? "").join("");
          }
          if (anyValue.text) return String(anyValue.text);
          if (anyValue.result != null) return cellValueToString(anyValue.result as ExcelJS.CellValue);
          if (anyValue.formula) return String(anyValue.formula);
          if (anyValue.sharedFormula) return String(anyValue.sharedFormula);
          if (anyValue.hyperlink) return String(anyValue.hyperlink);
        }
        return undefined;
      };

      const findCell = (worksheet: ExcelJS.Worksheet, matcher: (value: string) => boolean): { r: number; c: number } | null => {
        const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
        let maxCols = worksheet.columnCount;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          if (row.cellCount > maxCols) maxCols = row.cellCount;
        });

        for (let r = 1; r <= maxRows; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            const text = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
            if (text && matcher(text)) {
              return { r: r - 1, c: c - 1 };
            }
          }
        }
        return null;
      };

      const findAllCells = (worksheet: ExcelJS.Worksheet, matcher: (value: string) => boolean): Array<{ r: number; c: number }> => {
        const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
        let maxCols = worksheet.columnCount;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          if (row.cellCount > maxCols) maxCols = row.cellCount;
        });

        const matches: Array<{ r: number; c: number }> = [];
        for (let r = 1; r <= maxRows; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            const text = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
            if (text && matcher(text)) {
              matches.push({ r: r - 1, c: c - 1 });
            }
          }
        }
        return matches;
      };

      const setNextToLabel = (worksheet: ExcelJS.Worksheet, regex: RegExp, value?: string) => {
        if (!value) return;
        const pos = findCell(worksheet, (text) => regex.test(text));
        if (!pos) return;

        const targetCell = worksheet.getCell(pos.r + 1, pos.c + 2);
        const existing = cellValueToString(targetCell.value as ExcelJS.CellValue | undefined);
        if (existing && existing.trim().length > 0 && existing.trim() !== value.trim()) {
          return;
        }
        setCell(worksheet, pos.r, pos.c + 1, value);
      };

      const setCell = (worksheet: ExcelJS.Worksheet, r: number, c: number, value: string | number | undefined) => {
        if (value == null) return;
        worksheet.getCell(r + 1, c + 1).value = value;
      };

      const ensureUniqueSheetName = (base: string, workbook: ExcelJS.Workbook) => {
        let trimmed = base.trim() ? base.trim().slice(0, 31) : "";
        if (!trimmed) trimmed = `Sheet_${workbook.worksheets.length + 1}`;
        if (!workbook.getWorksheet(trimmed)) return trimmed;
        let index = 1;
        while (index < 50) {
          const suffix = `_${index}`;
          const candidate = `${trimmed.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
          if (!workbook.getWorksheet(candidate)) return candidate;
          index += 1;
        }
        return `${trimmed.slice(0, 25)}_${Date.now()}`.slice(0, 31);
      };

      const outWorkbook = new ExcelJS.Workbook();
      outWorkbook.views = templateWorkbook.views?.map((view) => ({ ...view }));

      for (const group of body.classes) {
        const className = normalizeLabel(group.className, "غير محدد");
        for (const div of group.divisions) {
          const divisionName = normalizeLabel(div.division, "بدون شعبة");
          const groupKey = `${className}|||${divisionName}`;
          const gradebookGroup = body.gradebook?.byGroup?.[groupKey];
          const gradesByStudentId = gradebookGroup?.gradesByStudentId ?? {};
          const subjects = Array.isArray(div.subjects) && div.subjects.length > 0 ? div.subjects : [{ id: "__default", name: "" }];

          for (const subject of subjects) {
            const subjectNameRaw = normalizeLabel(subject?.name, "");
            const baseSheetName = sanitizeSheetName([className, divisionName, subjectNameRaw].filter(Boolean).join(" - "));
            const fallbackSheet = sanitizeSheetName(`${className}-${divisionName}`) || "Sheet";
            const sheetKey = ensureUniqueSheetName(baseSheetName || fallbackSheet, outWorkbook);
            const worksheet = cloneWorksheet(templateSheet!, outWorkbook, sheetKey);

            setCell(worksheet, 1, 1, className);
            setCell(worksheet, 1, 5, divisionName);
            if (subjectNameRaw) setCell(worksheet, 1, 10, subjectNameRaw);
            if (body.isHomeroom && body.teacherName && body.homeroomClass === `${group.className}-${div.division}`) {
              setCell(worksheet, 2, 1, body.teacherName);
            }
            const footerLabel = baseSheetName || sanitizeSheetName([className, divisionName].filter(Boolean).join(" - "));
            if (footerLabel) {
              worksheet.headerFooter.differentOddEven = false;
              worksheet.headerFooter.oddFooter = `&C${footerLabel}`;
            }

            setNextToLabel(worksheet, /الصف/, className);
            setNextToLabel(worksheet, /الشعبة/, divisionName);
            setNextToLabel(worksheet, /(المادة|المادة\s*الدراسية|المبحث)/, subjectNameRaw);
            setNextToLabel(worksheet, /المدرسة/, normalizeLabel(body.school));
            setNextToLabel(worksheet, /المديرية/, normalizeLabel(body.directorate));
            setNextToLabel(worksheet, /(اسم\s*المعلم|المعلم)/, body.teacherName);
            setNextToLabel(worksheet, /(البلدة|الموقع)/, normalizeLabel(body.town));
            setNextToLabel(worksheet, /(البرنامج|المسار)/, normalizeLabel(body.program));
            setNextToLabel(worksheet, /(العام\s*الدراسي|السنة\s*الدراسية)/, normalizeLabel(body.year));

            const nameHeaderPos = findCell(worksheet, (text) => /(الاسم|اسم\s*الطالب)/.test(text));
            const numberHeaderPos = findCell(worksheet, (text) => /(الرقم\s*المتسلسل|^\s*م\s*$)/.test(text));
            const nameCol = nameHeaderPos ? nameHeaderPos.c : 1;
            const numCol = numberHeaderPos ? numberHeaderPos.c : 0;
            const startRow = nameHeaderPos ? nameHeaderPos.r + 3 : 6;

            const headerMinRow = nameHeaderPos ? nameHeaderPos.r : 0;
            const headerMaxRow = Math.max(headerMinRow, startRow - 1);

            const pickHeaderCols = (regex: RegExp) => {
              const cols = findAllCells(worksheet, (text) => regex.test(text))
                .filter((pos) => pos.r >= headerMinRow && pos.r <= headerMaxRow)
                .map((pos) => pos.c)
                .filter((c) => typeof c === "number" && Number.isFinite(c));
              return Array.from(new Set(cols)).sort((a, b) => a - b);
            };

            const eval1Cols = pickHeaderCols(/(التقويم\s*الأول|التقويم\s*الاول)/);
            const eval2Cols = pickHeaderCols(/التقويم\s*الثاني/);
            const eval3Cols = pickHeaderCols(/التقويم\s*الثالث/);
            const finalCols = pickHeaderCols(/الاختبار\s*النهائي/);
            const totalCols = pickHeaderCols(/المجموع/);
            const annualCols = pickHeaderCols(/النتيجة\s*السنوية/);
            const avgCols = pickHeaderCols(/المعدل/);
            const noteCols = pickHeaderCols(/(ملحوظات|ملاحظات)/);

            const t1Eval1Col = eval1Cols[0] ?? null;
            const t1Eval2Col = eval2Cols[0] ?? null;
            const t1Eval3Col = eval3Cols[0] ?? null;
            const t1FinalCol = finalCols[0] ?? null;
            const t1TotalCol = totalCols[0] ?? null;

            const t2Eval1Col = eval1Cols[1] ?? null;
            const t2Eval2Col = eval2Cols[1] ?? null;
            const t2Eval3Col = eval3Cols[1] ?? null;
            const t2FinalCol = finalCols[1] ?? null;
            const t2TotalCol = totalCols[1] ?? null;

            const annualCol = annualCols[0] ?? avgCols[avgCols.length - 1] ?? null;
            const notesCol = noteCols[0] ?? null;
            const hasSecondTermCols = [t2Eval1Col, t2Eval2Col, t2Eval3Col, t2FinalCol, t2TotalCol].some((col) => col != null);

            const students = body.students
              .filter((s) => normalizeLabel(s.class, "غير محدد") === className && normalizeLabel(s.division, "بدون شعبة") === divisionName)
              .slice()
              .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));

            students.forEach((student, idx) => {
              setCell(worksheet, startRow + idx, nameCol, student.name);
              setCell(worksheet, startRow + idx, numCol, idx + 1);

              const grade = gradesByStudentId?.[student.id] ?? {};
              const coerceMark = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

              const t1Values = [grade.t1Eval1, grade.t1Eval2, grade.t1Eval3, grade.t1Final].map((v) => coerceMark(v));
              const t2Values = [
                grade.t2Eval1 ?? grade.eval1,
                grade.t2Eval2 ?? grade.eval2,
                grade.t2Eval3 ?? grade.eval3,
                grade.t2Final ?? grade.final,
              ].map((v) => coerceMark(v));

              const hasT1Marks = t1Values.some((v) => v != null);
              const effectiveT1Values = !hasSecondTermCols && !hasT1Marks ? t2Values : t1Values;
              const effectiveT2Values = hasSecondTermCols ? t2Values : [null, null, null, null];

              const t1Total = effectiveT1Values.reduce<number>((sum, v) => (v != null ? sum + v : sum), 0);
              const t2Total = effectiveT2Values.reduce<number>((sum, v) => (v != null ? sum + v : sum), 0);
              const t1Filled = effectiveT1Values.filter((v) => v != null).length;
              const t2Filled = effectiveT2Values.filter((v) => v != null).length;
              const annualValues = [...effectiveT1Values, ...effectiveT2Values].filter((v) => v != null) as number[];
              const annualAvg = annualValues.length > 0 ? annualValues.reduce((sum, v) => sum + v, 0) / annualValues.length : null;
              const noteText = typeof grade.note === "string" ? grade.note.trim() : "";

              if (t1Eval1Col != null) setCell(worksheet, startRow + idx, t1Eval1Col, effectiveT1Values[0] ?? undefined);
              if (t1Eval2Col != null) setCell(worksheet, startRow + idx, t1Eval2Col, effectiveT1Values[1] ?? undefined);
              if (t1Eval3Col != null) setCell(worksheet, startRow + idx, t1Eval3Col, effectiveT1Values[2] ?? undefined);
              if (t1FinalCol != null) setCell(worksheet, startRow + idx, t1FinalCol, effectiveT1Values[3] ?? undefined);
              if (t1TotalCol != null) setCell(worksheet, startRow + idx, t1TotalCol, t1Filled > 0 ? t1Total : undefined);

              if (t2Eval1Col != null) setCell(worksheet, startRow + idx, t2Eval1Col, effectiveT2Values[0] ?? undefined);
              if (t2Eval2Col != null) setCell(worksheet, startRow + idx, t2Eval2Col, effectiveT2Values[1] ?? undefined);
              if (t2Eval3Col != null) setCell(worksheet, startRow + idx, t2Eval3Col, effectiveT2Values[2] ?? undefined);
              if (t2FinalCol != null) setCell(worksheet, startRow + idx, t2FinalCol, effectiveT2Values[3] ?? undefined);
              if (t2TotalCol != null) setCell(worksheet, startRow + idx, t2TotalCol, t2Filled > 0 ? t2Total : undefined);

              if (annualCol != null) setCell(worksheet, startRow + idx, annualCol, annualAvg != null ? Number(annualAvg.toFixed(2)) : undefined);
              if (notesCol != null) setCell(worksheet, startRow + idx, notesCol, noteText ? noteText : undefined);
            });
          }
        }
      }

      const id = nanoid(10);
      const filename = `سجلات_العلامات_النهائية_${id}.xlsx`;
      const exportPath = path.resolve(exportsDir, filename);
      await outWorkbook.xlsx.writeFile(exportPath);
      exportFiles.set(id, exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id,
          filename,
          kind: "side-gradebook",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id, filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export" });
    }
  });

  app.post("/api/export/performance", async (req, res) => {
    try {
      const body = req.body as {
        teacherName?: string;
        classes: { className: string; divisions: { id: string; division: string; subjects: { id: string; name: string }[] }[] }[];
        students: { id: string; name: string; class: string; division: string }[];
      };

      if (!body || !Array.isArray(body.classes) || !Array.isArray(body.students)) {
        return res.status(400).json({ message: "invalid payload" });
      }

      const user = (res.locals as any).user;
      await applyUserContext(user, body as any);

      const projectRoot = path.resolve(getCurrentDir(), "..");
      const templatesDir = path.resolve(projectRoot, "templates");
      const templatePath = fs.existsSync(path.resolve(templatesDir, "adaa.xlsx"))
        ? path.resolve(templatesDir, "adaa.xlsx")
        : path.resolve(projectRoot, "adaa.xlsx");
      const exportsDir = path.resolve(projectRoot, "exports");
      await fs.promises.mkdir(exportsDir, { recursive: true });

      let templateWorkbook = new ExcelJS.Workbook();
      let templateSheet: ExcelJS.Worksheet | null = null;
      try {
        if (fs.existsSync(templatePath)) {
          await templateWorkbook.xlsx.readFile(templatePath);
          templateSheet = templateWorkbook.worksheets[0] ?? null;
        }
      } catch {}

      if (!templateSheet) {
        templateWorkbook = new ExcelJS.Workbook();
        templateSheet = templateWorkbook.addWorksheet("Template", {
          views: [{ rightToLeft: true }],
        });
        templateSheet.getCell("A1").value = "الصف:";
        templateSheet.getCell("A2").value = "الشعبة:";
        templateSheet.getCell("B3").value = "المادة:";
        templateSheet.getCell("B4").value = "المعلم:";
        templateSheet.getCell("A6").value = "م";
        templateSheet.getCell("B6").value = "اسم الطالب";
      }

      const cloneWorksheet = (source: ExcelJS.Worksheet, target: ExcelJS.Workbook, name: string) => {
        const worksheet = target.addWorksheet(name, {
          properties: { ...source.properties },
          pageSetup: { ...source.pageSetup },
          views: source.views?.map((view) => ({ ...view })) ?? undefined,
        });

        if (source.columns?.length) {
          worksheet.columns = source.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width,
            hidden: column.hidden,
            outlineLevel: column.outlineLevel,
            style: column.style ? { ...column.style } : undefined,
          }));
        }

        source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const targetRow = worksheet.getRow(rowNumber);
          targetRow.height = row.height;
          targetRow.outlineLevel = row.outlineLevel;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber);
            targetCell.value = cell.value;
            if (cell.style) targetCell.style = { ...cell.style };
            if (cell.alignment) targetCell.alignment = { ...cell.alignment };
            if (cell.font) targetCell.font = { ...cell.font };
            if (cell.border) targetCell.border = { ...cell.border };
            if (cell.fill) targetCell.fill = { ...cell.fill };
            if (cell.numFmt) targetCell.numFmt = cell.numFmt;
          });
        });

        const merges = ((source as unknown as { model?: { merges?: string[] } }).model?.merges) ?? [];
        merges.forEach((mergeRef) => {
          worksheet.mergeCells(mergeRef);
        });

        return worksheet;
      };

      const cellValueToString = (value: ExcelJS.CellValue | undefined): string | undefined => {
        if (value == null) return undefined;
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") {
          const anyValue = value as any;
          if (Array.isArray(anyValue.richText)) {
            return anyValue.richText.map((part: any) => part?.text ?? "").join("");
          }
          if (anyValue.text) return String(anyValue.text);
          if (anyValue.result != null) return cellValueToString(anyValue.result as ExcelJS.CellValue);
          if (anyValue.formula) return String(anyValue.formula);
          if (anyValue.sharedFormula) return String(anyValue.sharedFormula);
          if (anyValue.hyperlink) return String(anyValue.hyperlink);
        }
        return undefined;
      };

      const findCell = (worksheet: ExcelJS.Worksheet, matcher: (value: string) => boolean): { r: number; c: number } | null => {
        const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
        let maxCols = worksheet.columnCount;
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          if (row.cellCount > maxCols) maxCols = row.cellCount;
        });

        for (let r = 1; r <= maxRows; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            const text = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
            if (text && matcher(text)) {
              return { r: r - 1, c: c - 1 };
            }
          }
        }
        return null;
      };

      const setCell = (worksheet: ExcelJS.Worksheet, r: number, c: number, value: string | number | undefined) => {
        if (value == null) return;
        worksheet.getCell(r + 1, c + 1).value = value;
      };

      const ensureUniqueSheetName = (base: string, workbook: ExcelJS.Workbook) => {
        let trimmed = base.trim() ? base.trim().slice(0, 31) : "";
        if (!trimmed) trimmed = `Sheet_${workbook.worksheets.length + 1}`;
        if (!workbook.getWorksheet(trimmed)) return trimmed;
        let index = 1;
        while (index < 50) {
          const suffix = `_${index}`;
          const candidate = `${trimmed.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
          if (!workbook.getWorksheet(candidate)) return candidate;
          index += 1;
        }
        return `${trimmed.slice(0, 25)}_${Date.now()}`.slice(0, 31);
      };

      const outWorkbook = new ExcelJS.Workbook();
      outWorkbook.views = templateWorkbook.views?.map((view) => ({ ...view }));

      for (const group of body.classes) {
        const className = normalizeLabel(group.className, "غير محدد");
        for (const div of group.divisions) {
          const divisionName = normalizeLabel(div.division, "بدون شعبة");
          const subjects = Array.isArray(div.subjects) && div.subjects.length > 0 ? div.subjects : [{ id: "__default", name: "" }];

          for (const subject of subjects) {
            const subjectNameRaw = normalizeLabel(subject?.name, "");
            const baseSheetName = sanitizeSheetName([className, divisionName, subjectNameRaw].filter(Boolean).join(" - "));
            const fallbackSheet = sanitizeSheetName(`${className}-${divisionName}`) || "Sheet";
            const sheetKey = ensureUniqueSheetName(baseSheetName || fallbackSheet, outWorkbook);
            const worksheet = cloneWorksheet(templateSheet!, outWorkbook, sheetKey);

            if (className) worksheet.getCell("A1").value = `الصف: ${className}`;
            if (divisionName) worksheet.getCell("A2").value = `الشعبة: ${divisionName}`;
            if (subjectNameRaw) worksheet.getCell("B3").value = `المادة: ${subjectNameRaw}`;
            if (body.teacherName?.trim()) worksheet.getCell("B4").value = `المعلم: ${body.teacherName}`;

            const nameHeaderPos = findCell(worksheet, (text) => /(الاسم|اسم\s*الطالب)/.test(text));
            const numberHeaderPos = findCell(worksheet, (text) => /(الرقم\s*المتسلسل|^\s*م\s*$)/.test(text));
            const nameCol = nameHeaderPos ? nameHeaderPos.c : 1;
            const numCol = numberHeaderPos ? numberHeaderPos.c : 0;
            const startRow = nameHeaderPos ? nameHeaderPos.r + 1 : 5;

            const students = body.students
              .filter((s) => normalizeLabel(s.class, "غير محدد") === className && normalizeLabel(s.division, "بدون شعبة") === divisionName)
              .slice()
              .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));

            students.forEach((student, idx) => {
              setCell(worksheet, startRow + idx, nameCol, student.name);
              setCell(worksheet, startRow + idx, numCol, idx + 1);
            });
          }
        }
      }

      const id = nanoid(10);
      const filename = `سجلات_الاداء_والملاحظات_${id}.xlsx`;
      const exportPath = path.resolve(exportsDir, filename);
      await outWorkbook.xlsx.writeFile(exportPath);
      exportFiles.set(id, exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id,
          filename,
          kind: "performance",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id, filename });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "failed to export performance" });
    }
  });

  // Download last generated main gradebook
  app.get("/api/export/main-gradebook", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/certificate", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/lesson-attendance", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  // Download last generated side gradebook
  app.get("/api/export/side-gradebook", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  // Download last generated performance tracker
  app.get("/api/export/performance", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/performance-cover", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.get("/api/export/attendance", async (req, res) => {
    try {
      const id = (req.query.id as string) || "";
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  app.post("/api/export/schedule", async (req, res) => {
    try {
      console.log("[routes] Received schedule export request");
      const payload = req.body as ScheduleExportPayload;
      const user = (res.locals as any).user;
      await applyUserContext(user, payload as any);
      console.log("[routes] Payload:", JSON.stringify({
        studentCount: payload.students?.length,
        absenceCount: payload.absences?.length
      }));

      const result = await generateScheduleWorkbook(payload);
      console.log("[routes] Schedule workbook generated successfully:", result.filename);

      exportFiles.set(result.id, result.exportPath);
      if (user?.id) {
        recordExportForUser(user.id, {
          id: result.id,
          filename: result.filename,
          kind: "schedule",
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({ ok: true, id: result.id, filename: result.filename });
    } catch (e: any) {
      console.error("[routes] Error exporting schedule:", e);
      return res.status(500).json({ message: e?.message || "failed to export schedule" });
    }
  });

  app.get("/api/export/schedule/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const exportPath = exportFiles.get(id);
      if (!exportPath || !fs.existsSync(exportPath)) {
        return res.status(404).json({ message: "file not found" });
      }
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      sendExportAndCleanup(res, id, exportPath);
      return;
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "download failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

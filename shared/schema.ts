import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "teacher"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const schools = pgTable(
  "schools",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameUnique: uniqueIndex("schools_name_unique").on(t.name),
  }),
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("teacher"),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schools).pick({ name: true });

export const insertUserSchema = createInsertSchema(users, {
  role: userRoleSchema,
}).pick({
  username: true,
  passwordHash: true,
  name: true,
  role: true,
  schoolId: true,
});

export type TeacherRecordsStudent = {
  id: string;
  name: string;
  class: string;
  division: string;
  nationalId?: string;
  birthDate?: string;
  status?: string;
};

export type TeacherRecordsClassGroup = {
  className: string;
  divisions: Array<{
    id: string;
    division: string;
    subjects: Array<{ id: string; name: string }>;
  }>;
};

export type SideGradebookStudentGrades = {
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
};

export type SideGradebookGroupDraft = {
  className: string;
  division: string;
  gradesByStudentId: Record<string, SideGradebookStudentGrades>;
  updatedAt?: string;
};

export type SideGradebookState = {
  byGroup: Record<string, SideGradebookGroupDraft>;
  updatedAt?: string;
  version?: number;
};

export type MainGradebookStudentGrades = {
  t1Eval1?: number | null;
  t1Eval2?: number | null;
  t1Eval3?: number | null;
  t1Eval4?: number | null;
  t1Note?: string | null;
  t2Eval1?: number | null;
  t2Eval2?: number | null;
  t2Eval3?: number | null;
  t2Eval4?: number | null;
  completion?: number | null;
  note?: string | null;
};

export type MainGradebookGroupDraft = {
  className: string;
  division: string;
  subject: string;
  gradesByStudentId: Record<string, MainGradebookStudentGrades>;
  updatedAt?: string;
};

export type MainGradebookState = {
  byGroup: Record<string, MainGradebookGroupDraft>;
  updatedAt?: string;
  version?: number;
};

export type AttendanceStatus = "present" | "absent" | "excused";

export type AttendanceByDate = Record<string, Array<{ studentId: string; status: AttendanceStatus }>>;

export type AttendanceState = {
  byDivisionId: Record<string, AttendanceByDate>;
  updatedAt?: string;
  version?: number;
};

export type LessonAttendanceSession = {
  name: string;
  divisionId: string;
  subjectId?: string;
  presentById: Record<string, boolean>;
  active: boolean;
};

export type LessonAttendanceState = {
  sessions: LessonAttendanceSession[];
  day: string;
  date: string;
  teacherName?: string;
  signature?: string;
  updatedAt?: string;
  version?: number;
};

export type DashboardPerformanceFieldType = "text" | "number" | "select" | "boolean";

export type DashboardPerformanceField = {
  id: string;
  label: string;
  type: DashboardPerformanceFieldType;
  options?: string[];
};

export type DashboardPerformanceTemplate = {
  id: string;
  name: string;
  fields: DashboardPerformanceField[];
  updatedAt?: string;
};

export type DashboardPerformanceArchive = {
  id: string;
  title: string;
  divisionId: string;
  subjectId?: string;
  templateId?: string;
  term?: string;
  date?: string;
  createdAt: string;
  updatedAt?: string;
  valuesByStudentId: Record<string, Record<string, string | number | boolean | null>>;
  notesByStudentId: Record<string, string>;
};

export type DashboardPerformanceState = {
  templates: DashboardPerformanceTemplate[];
  archives: DashboardPerformanceArchive[];
  activeArchiveId?: string;
  updatedAt?: string;
  version?: number;
};

export type TeacherRecordsData = {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  program?: string;
  year?: string;
  isHomeroom?: boolean;
  homeroomClass?: string;
  schoolInfo?: { directorate: string; school: string; program: string };
  students: TeacherRecordsStudent[];
  classes: TeacherRecordsClassGroup[];
  sideGradebook?: SideGradebookState;
  mainGradebook?: MainGradebookState;
  attendance?: AttendanceState;
  lessonAttendance?: LessonAttendanceState;
  dashboardPerformance?: DashboardPerformanceState;
  source?: string;
  syncedAt?: string;
};

export const teacherRecords = pgTable("teacher_records", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<TeacherRecordsData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type TeacherRecord = typeof teacherRecords.$inferSelect;

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

const TEMPLATE_FILENAME = "sjel-ewmi.xlsx";
const DATA_START_ROW = 9;
const MAX_LESSONS = 7;

const LESSON_ORDINALS = [
  "الأولى",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
  "السابعة",
];

const DAY_DISPLAY_MAP: Record<string, string> = {
  "الأحد": "الأحد",
  "الاثنين": "الأثنين",
  "الإثنين": "الأثنين",
  "الثلاثاء": "الثلاثاء",
  "الأربعاء": "الأربعاء",
  "الخميس": "الخميس",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveTemplatePath = (): string => {
  const projectRoot = path.resolve(__dirname, "..");
  const candidates: string[] = [
    path.resolve(projectRoot, "templates", TEMPLATE_FILENAME),
    path.resolve(projectRoot, TEMPLATE_FILENAME),
  ];

  if (process.cwd() !== projectRoot) {
    candidates.push(path.resolve(process.cwd(), "templates", TEMPLATE_FILENAME));
    candidates.push(path.resolve(process.cwd(), TEMPLATE_FILENAME));
  }

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `تعذر العثور على القالب ${TEMPLATE_FILENAME}. تم البحث في:\n- ${candidates.join("\n- ")}`,
    );
  }

  return existing;
};

const ensureExportsDir = async (): Promise<string> => {
  const projectRoot = path.resolve(__dirname, "..");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });
  return exportsDir;
};

const isAbsentStatus = (status?: string | null): boolean => {
  if (!status) return false;
  const normalized = String(status).trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  if (lower === "غ" || lower === "غائب" || lower === "غياب" || lower === "absent") {
    return true;
  }

  if (/غياب|غائب|غايب|absent/i.test(normalized)) {
    return true;
  }

  return false;
};

const getLessonRow = (index: number): number => DATA_START_ROW + index;

const setCellValue = (sheet: ExcelJS.Worksheet, address: string, value?: ExcelJS.CellValue | null) => {
  sheet.getCell(address).value = value ?? null;
};

const centerCell = (sheet: ExcelJS.Worksheet, address: string, wrap = false) => {
  const cell = sheet.getCell(address);
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: wrap,
  };
};

const formatClassLabel = (className?: string, division?: string): string => {
  if (!className && !division) return "";
  if (!division) return className ?? "";
  if (!className) return division;
  return `${className} - ${division}`;
};

const normalizeLessonName = (name: string | undefined, index: number): string => {
  const fallback = LESSON_ORDINALS[index] ?? `الحصة ${index + 1}`;
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const prefixes = ["الحصة ", "حصة "];
  const prefix = prefixes.find((candidate) => trimmed.startsWith(candidate));
  if (prefix) {
    const remainder = trimmed.slice(prefix.length).trim();
    if (!remainder) {
      return fallback;
    }
    if (LESSON_ORDINALS.includes(remainder) || /^\d+/.test(remainder)) {
      return remainder;
    }
    return remainder;
  }

  return trimmed;
};

const formatDayLabel = (day?: string): string | null => {
  if (!day) return null;
  const trimmed = day.trim();
  if (!trimmed) return null;
  const display = DAY_DISPLAY_MAP[trimmed] ?? trimmed;
  return `اليوم: ${display}`;
};

const formatDateLabel = (date?: string): string | null => {
  if (!date) return null;
  const trimmed = date.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, dayPart] = isoMatch;
    const dayNumber = String(parseInt(dayPart, 10));
    const monthNumber = String(parseInt(month, 10));
    return `التاريخ:${dayNumber}/${monthNumber}/${year}`;
  }

  return `التاريخ:${trimmed}`;
};

export interface LessonAttendanceStudent {
  id: string;
  name: string;
}

export interface LessonAttendanceRecord {
  studentId: string;
  status?: string;
}

export interface LessonEntry {
  id: string;
  name: string;
  className?: string;
  division?: string;
  subject?: string;
  studentIds?: string[];
  absentStudentIds?: string[];
  attendance?: LessonAttendanceRecord[];
  teacherName?: string;
  signature?: string;
}

export interface LessonAttendancePayload {
  directorate?: string;
  school?: string;
  day?: string;
  date?: string;
  className: string;
  division?: string;
  subject?: string;
  teacherName?: string;
  signature?: string;
  students: LessonAttendanceStudent[];
  lessons: LessonEntry[];
}

export interface LessonAttendanceResult {
  id: string;
  filename: string;
  exportPath: string;
}

const clearLessonRows = (sheet: ExcelJS.Worksheet) => {
  for (let i = 0; i < MAX_LESSONS; i++) {
    const rowIndex = getLessonRow(i);
    ["B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
      setCellValue(sheet, `${col}${rowIndex}`, null);
    });
  }
};

const unique = <T>(items: T[]): T[] => {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
};

export async function generateLessonAttendanceWorkbook(
  payload: LessonAttendancePayload,
): Promise<LessonAttendanceResult> {
  if (!payload) {
    throw new Error("invalid lesson attendance payload");
  }

  if (!payload.className) {
    throw new Error("يجب تحديد اسم الصف");
  }

  if (!Array.isArray(payload.students) || payload.students.length === 0) {
    throw new Error("لا يوجد طلبة في الحمولة");
  }

  const templatePath = resolveTemplatePath();
  const exportsDir = await ensureExportsDir();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("تعذر تحديد ورقة العمل في القالب");
  }

  if (payload.directorate) {
    setCellValue(sheet, "B4", payload.directorate);
  }
  if (payload.school) {
    setCellValue(sheet, "B5", payload.school);
  }
  const dayLabel = formatDayLabel(payload.day);
  if (dayLabel) {
    setCellValue(sheet, "G4", dayLabel);
  }
  const dateLabel = formatDateLabel(payload.date);
  if (dateLabel) {
    setCellValue(sheet, "G5", dateLabel);
  }

  clearLessonRows(sheet);

  const studentsById = new Map(payload.students.map((student) => [student.id, student] as const));
  const lessons = Array.isArray(payload.lessons) ? payload.lessons.slice(0, MAX_LESSONS) : [];

  lessons.forEach((lesson, index) => {
    const rowIndex = getLessonRow(index);

    const fallbackIds = payload.students.map((student) => student.id);
    const lessonStudentIds = unique([
      ...(Array.isArray(lesson.studentIds) && lesson.studentIds.length > 0
        ? lesson.studentIds
        : fallbackIds),
    ]);

    const lessonClassLabel = formatClassLabel(
      lesson.className ?? payload.className,
      lesson.division ?? payload.division,
    );

    const absentIdSet = new Set<string>();

    if (Array.isArray(lesson.absentStudentIds)) {
      lesson.absentStudentIds.forEach((id) => {
        if (studentsById.has(id)) {
          absentIdSet.add(id);
        }
      });
    }

    if (Array.isArray(lesson.attendance)) {
      lesson.attendance.forEach((record) => {
        if (!record || !studentsById.has(record.studentId)) return;
        if (isAbsentStatus(record.status)) {
          absentIdSet.add(record.studentId);
        }
      });
    }

    const absentNames: string[] = [];
    lessonStudentIds.forEach((id) => {
      if (absentIdSet.has(id)) {
        const name = studentsById.get(id)?.name ?? "";
        if (name && name.trim().length > 0) {
          absentNames.push(name);
        }
        absentIdSet.delete(id);
      }
    });

    if (absentIdSet.size > 0) {
      absentIdSet.forEach((id) => {
        const name = studentsById.get(id)?.name ?? "";
        if (name && name.trim().length > 0 && !absentNames.includes(name)) {
          absentNames.push(name);
        }
      });
    }

    const studentCount = lessonStudentIds.filter((id) => studentsById.has(id)).length;

    setCellValue(sheet, `B${rowIndex}`, normalizeLessonName(lesson.name, index));
    setCellValue(sheet, `C${rowIndex}`, lessonClassLabel);
    setCellValue(sheet, `D${rowIndex}`, studentCount || payload.students.length);
    setCellValue(sheet, `E${rowIndex}`, absentNames.length);
    setCellValue(sheet, `F${rowIndex}`, absentNames.length > 0 ? absentNames.join("\n") : null);
    setCellValue(sheet, `G${rowIndex}`, lesson.teacherName ?? payload.teacherName ?? null);
    setCellValue(sheet, `H${rowIndex}`, lesson.signature ?? payload.signature ?? null);

    ["B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
      centerCell(sheet, `${col}${rowIndex}`, col === "F");
    });
  });

  const id = nanoid(10);
  const filename = `سجل_الحصة_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);
  await workbook.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

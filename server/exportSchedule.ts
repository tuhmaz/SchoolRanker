import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

/* ====================== Types ====================== */

export interface ScheduleStudent {
  id: string;
  firstName?: string;
  fatherName?: string;
  grandName?: string;
  familyName?: string;
  fullName?: string;
  classId: string;
}

export interface ScheduleAbsenceRecord {
  studentId: string;
  month: string; // e.g. "أيلول"
  absenceCount: number;
}

export interface ScheduleExportPayload {
  school?: string;
  directorate?: string;
  year?: string;
  students: ScheduleStudent[];
  absences: ScheduleAbsenceRecord[];
}

export interface ScheduleExportResult {
  id: string;
  filename: string;
  exportPath: string;
}

/* ====================== Constants ====================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// الفصل الدراسي الأول: 6 أشهر (آب - كانون الثاني)
const SEMESTER_1_MONTHS = [
  "آب",
  "ايلول",
  "تشرين الاول",
  "تشرين الثاني",
  "كانون الاول",
  "كانون الثاني",
];

// الفصل الدراسي الثاني: 5 أشهر (شباط - حزيران)
const SEMESTER_2_MONTHS = [
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
];

const HEADER_ROW = 1;
const SUBHEADER_ROW = 2;
const COLUMN_NAMES_ROW = 3;
const DATA_START_ROW = 4;

const SERIAL_COLUMN = "A";
const NAME_COLUMNS = {
  first: "B",
  father: "C",
  grand: "D",
  family: "E",
};

/* ====================== Utilities ====================== */

const resolveTemplatePath = (): string => {
  const candidate1 = path.resolve(__dirname, "..", "templates", "Student_schedule.xlsx");
  if (fs.existsSync(candidate1)) return candidate1;

  throw new Error(`تعذر العثور على القالب Student_schedule.xlsx في ${candidate1}`);
};

const toText = (value: ExcelJS.CellValue | undefined): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    const anyVal = value as any;
    if (anyVal.text) return String(anyVal.text);
    if (Array.isArray(anyVal.richText)) {
      return anyVal.richText.map((i: any) => i?.text ?? "").join("");
    }
  }
  return "";
};

const splitName = (student: ScheduleStudent) => {
  if (student.firstName || student.fatherName || student.grandName || student.familyName) {
    return {
      first: student.firstName ?? "",
      father: student.fatherName ?? "",
      grand: student.grandName ?? "",
      family: student.familyName ?? "",
    };
  }
  const parts = (student.fullName ?? "").trim().split(/\s+/);
  return {
    first: parts[0] ?? "",
    father: parts[1] ?? "",
    grand: parts[2] ?? "",
    family: parts.slice(3).join(" ") ?? "",
  };
};

const columnNumberToLetter = (colNumber: number): string => {
  let column = "";
  let current = colNumber;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }
  return column;
};

const normalizeArabic = (value: string): string => {
  return value
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[\u0640\u200F\u200E]/g, "")
    .replace(/[اأإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase();
};

const buildAbsenceLookup = (records: ScheduleAbsenceRecord[]) => {
  const map = new Map<string, Map<string, number>>();
  for (const record of records) {
    if (!record?.studentId || typeof record.absenceCount !== "number") continue;
    const monthKey = normalizeArabic(record.month ?? "");
    if (!monthKey) continue;
    const studentMap = map.get(record.studentId) ?? new Map<string, number>();
    const current = studentMap.get(monthKey) ?? 0;
    studentMap.set(monthKey, current + Math.max(0, record.absenceCount));
    map.set(record.studentId, studentMap);
  }
  return map;
};

const collectMonthColumns = (sheet: ExcelJS.Worksheet, months: string[]) => {
  const headerRow = sheet.getRow(COLUMN_NAMES_ROW);
  const lookup = new Map<string, number>();
  const normalizedTargets = months.map((m) => normalizeArabic(m));

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerName = normalizeArabic(toText(cell.value));
    if (!headerName) return;
    const monthIdx = normalizedTargets.indexOf(headerName);
    if (monthIdx === -1) return;
    const targetKey = normalizedTargets[monthIdx];
    if (lookup.has(targetKey)) return;
    lookup.set(targetKey, colNumber);
  });

  return lookup;
};

/* ====================== Main Export ====================== */

export async function generateScheduleWorkbook(
  payload: ScheduleExportPayload
): Promise<ScheduleExportResult> {
  if (!payload || !Array.isArray(payload.students)) {
    throw new Error("invalid schedule payload");
  }

  const templatePath = resolveTemplatePath();
  const projectRoot = path.resolve(__dirname, "..");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });
  const outWb = new ExcelJS.Workbook();
  await outWb.xlsx.readFile(templatePath);

  const absenceLookup = buildAbsenceLookup(payload.absences ?? []);

  const students = payload.students
    .slice()
    .sort((a, b) => {
      const nameA = (a.fullName ?? `${a.firstName ?? ""} ${a.fatherName ?? ""} ${a.grandName ?? ""} ${a.familyName ?? ""}`).trim();
      const nameB = (b.fullName ?? `${b.firstName ?? ""} ${b.fatherName ?? ""} ${b.grandName ?? ""} ${b.familyName ?? ""}`).trim();
      return nameA.localeCompare(nameB, "ar", { sensitivity: "base" });
    });

  const fillSheet = (sheetName: string, months: string[]) => {
    const sheet = outWb.worksheets.find((s) => s.name.trim() === sheetName.trim());
    if (!sheet) {
      throw new Error(`تعذر العثور على ورقة باسم '${sheetName}' داخل القالب`);
    }

    const monthColumns = collectMonthColumns(sheet, months);
    const normalizedMonths = months.map((m) => normalizeArabic(m));

    normalizedMonths.forEach((key, idx) => {
      if (!monthColumns.has(key)) {
        throw new Error(`تعذر تحديد العمود الخاص بالشهر '${months[idx]}' في الورقة '${sheetName}'`);
      }
    });

    const monthColumnNumbers = normalizedMonths.map((key) => monthColumns.get(key)!);
    const maxTemplateRow = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0);

    for (let rowNum = DATA_START_ROW; rowNum <= maxTemplateRow; rowNum++) {
      const row = sheet.getRow(rowNum);
      row.getCell(SERIAL_COLUMN).value = null;
      Object.values(NAME_COLUMNS).forEach((col) => {
        row.getCell(col).value = null;
      });
      monthColumnNumbers.forEach((colNum) => {
        row.getCell(colNum).value = null;
      });
    }

    students.forEach((student, idx) => {
      const rowNum = DATA_START_ROW + idx;
      const row = sheet.getRow(rowNum);

      row.getCell(SERIAL_COLUMN).value = idx + 1;

      const { first, father, grand, family } = splitName(student);
      const nameFields = [
        { col: NAME_COLUMNS.first, value: first },
        { col: NAME_COLUMNS.father, value: father },
        { col: NAME_COLUMNS.grand, value: grand },
        { col: NAME_COLUMNS.family, value: family },
      ];

      nameFields.forEach(({ col, value }) => {
        row.getCell(col).value = value || null;
      });

      const studentAbsences = absenceLookup.get(student.id) ?? new Map<string, number>();
      normalizedMonths.forEach((monthKey, monthIdx) => {
        const colNum = monthColumnNumbers[monthIdx];
        const absenceCount = studentAbsences.get(monthKey) ?? 0;
        const cell = row.getCell(colNum);
        cell.value = absenceCount > 0 ? absenceCount : null;
      });
    });
  };

  fillSheet("الفصل الأول", SEMESTER_1_MONTHS);
  fillSheet("الفصل الثاني", SEMESTER_2_MONTHS);

  // حفظ الملف
  const id = nanoid(10);
  const filename = `جدول_الغياب_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);
  await outWb.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

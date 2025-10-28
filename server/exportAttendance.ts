// attendance-export.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

/* ====================== Types (unchanged API) ====================== */

export interface AttendanceStudent {
  id: string;
  firstName?: string;
  fatherName?: string;
  grandName?: string;
  familyName?: string;
  fullName?: string;
  classId: string;
}

export interface AttendanceClassInput {
  id: string;
  name: string;
  sheetName?: string;
}

export interface AttendanceDayRecord {
  studentId: string;
  date: string; // ISO
  status: "present" | "absent" | "excused";
}

export interface AttendancePayload {
  school?: string;
  directorate?: string;
  teacherName?: string;
  town?: string;
  year?: string; // e.g. "2025"
  month: number; // fallback if months array not provided
  months?: number[]; // optional multi-month export
  termName?: string;
  classes: AttendanceClassInput[];
  students: AttendanceStudent[];
  attendance: AttendanceDayRecord[];
}

export interface AttendanceExportResult {
  id: string;
  filename: string;
  exportPath: string;
}

/* ====================== Config / Constants ====================== */

// بنية القالب المحدث (2025):
// - الصف 2: أرقام الأيام (1, 2, 3, ...)
// - الصف 3: أسماء الأيام (الأحد, الإثنين, ...) أو العطل (الجمعة, السبت, عطلة...)
// - الصف 4 فما فوق: بيانات الطلاب
// - الأعمدة A-E: التسلسل والأسماء
// - الأعمدة F فما فوق: أيام الشهر

const DAY_NUMBER_ROW = 2;
const DAY_NAME_ROW = 3;
const STUDENT_START_ROW = 4;

const ATTENDANCE_SERIAL_COLUMN = "A";
const ATTENDANCE_NAME_COLUMNS = {
  first: "B",
  father: "C",
  grand: "D",
  family: "E",
} as const;

const MONTH_NAME_MAP: Record<number, string> = {
  1: "كانون الثاني",
  2: "شباط",
  3: "آذار",
  4: "نيسان",
  5: "أيار",
  6: "حزيران",
  7: "تموز",
  8: "آب",
  9: "أيلول",
  10: "تشرين الأول",
  11: "تشرين الثاني",
  12: "كانون الأول",
};

const WEEKEND_KEYWORDS = ["جمعة", "الجمعة", "سبت", "السبت"];

// العلامات المستخدمة داخل خلايا الأيام
const PRESENT_MARK = "✔";
const ABSENT_MARK = "✗";
const EXCUSED_MARK = "م";

/* ====================== Utilities ====================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveTemplatePath = (): string => {
  const candidate1 = path.resolve(__dirname, "..", "templates", "Attendance and absence.xlsx");
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.resolve("/mnt/data/Attendance and absence.xlsx");
  if (fs.existsSync(candidate2)) return candidate2;

  throw new Error(
    `تعذر العثور على القالب Attendance and absence.xlsx. ابحثتُ في:
- ${candidate1}
- ${candidate2}`
  );
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

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

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

const normalizeDigits = (value: string): string =>
  value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const splitName = (student: AttendanceStudent) => {
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

const collectDayColumns = (sheet: ExcelJS.Worksheet) => {
  const dayNumberRow = sheet.getRow(DAY_NUMBER_ROW);
  const dayNameRow = sheet.getRow(DAY_NAME_ROW);
  const numericColumns: { columnLetter: string; dayNumber: number; isWeekend: boolean }[] = [];

  dayNumberRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const raw = normalizeDigits(toText(cell.value).trim()).replace(/[^\d]/g, "");
    if (!raw) return;
    const dayNum = Number.parseInt(raw, 10);
    if (Number.isNaN(dayNum) || dayNum < 1 || dayNum > 31) return;

    const columnLetter = columnNumberToLetter(colNumber);
    const dayNameCell = dayNameRow.getCell(colNumber);
    const dayText = toText(dayNameCell.value);
    const isWeekend = WEEKEND_KEYWORDS.some((kw) => dayText.includes(kw));

    numericColumns.push({ columnLetter, dayNumber: dayNum, isWeekend });
  });

  if (numericColumns.length === 0) {
    throw new Error("تعذر تحديد أعمدة الأيام في القالب");
  }

  return numericColumns;
};

const buildAttendanceMap = (records: AttendanceDayRecord[], month: number, allowedYears?: Set<number>) => {
  const map = new Map<string, Map<number, string>>();
  for (const record of records) {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) continue;

    // نستخدم UTC لتجنّب انزياحات التوقيت
    const recYear = date.getUTCFullYear();
    const recMonth = date.getUTCMonth() + 1;
    if (recMonth !== month) continue;
    if (allowedYears && !allowedYears.has(recYear)) continue;
    const day = date.getUTCDate();

    const mark =
      record.status === "present"
        ? PRESENT_MARK
        : record.status === "excused"
        ? EXCUSED_MARK
        : ABSENT_MARK;

    const studentMap = map.get(record.studentId) ?? new Map<number, string>();
    studentMap.set(day, mark);
    map.set(record.studentId, studentMap);
  }
  return map;
};

const applyNames = (
  sheet: ExcelJS.Worksheet,
  columns: typeof ATTENDANCE_NAME_COLUMNS,
  row: number,
  student: AttendanceStudent
) => {
  const { first, father, grand, family } = splitName(student);
  sheet.getCell(`${columns.first}${row}`).value = first;
  sheet.getCell(`${columns.father}${row}`).value = father;
  sheet.getCell(`${columns.grand}${row}`).value = grand;
  sheet.getCell(`${columns.family}${row}`).value = family;
};

const fillAttendanceRow = (
  sheet: ExcelJS.Worksheet,
  row: number,
  serial: number,
  student: AttendanceStudent,
  dayColumns: { columnLetter: string; dayNumber: number; isWeekend: boolean }[],
  attendance: Map<number, string>,
  daysInSelectedMonth: number
) => {
  sheet.getCell(`${ATTENDANCE_SERIAL_COLUMN}${row}`).value = serial;
  applyNames(sheet, ATTENDANCE_NAME_COLUMNS, row, student);

  dayColumns.forEach(({ columnLetter, dayNumber, isWeekend }) => {
    const cell = sheet.getCell(`${columnLetter}${row}`);
    
    // الحصول على القيمة الحالية من الخلية
    const currentValue = toText(cell.value).trim();
    
    // إذا كانت الخلية تحتوي على "عطلة" أو نص خاص، نتركها كما هي
    if (currentValue && (currentValue.includes("عطلة") || currentValue.includes("عطله"))) {
      // لا نغير شيء - نحافظ على النص الأصلي
      return;
    }

    if (dayNumber > daysInSelectedMonth || isWeekend) {
      cell.value = "";
      return;
    }

    if (attendance.has(dayNumber)) {
      cell.value = attendance.get(dayNumber);
    } else {
      cell.value = "";
    }
  });
};

/* ====================== Main Export ====================== */

export async function generateAttendanceWorkbook(
  payload: AttendancePayload
): Promise<AttendanceExportResult> {
  // تحقق من سلامة الحمولة
  if (!payload || !Array.isArray(payload.classes) || !Array.isArray(payload.students)) {
    throw new Error("invalid attendance payload");
  }
  const rawMonths = Array.isArray(payload.months) ? payload.months : [];
  const monthCandidates = rawMonths.length > 0 ? rawMonths : [payload.month];

  const uniqueMonths = Array.from(
    new Set(
      monthCandidates
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12),
    ),
  ).sort((a, b) => a - b);

  if (uniqueMonths.length === 0) {
    throw new Error("يجب تحديد شهر واحد على الأقل (1-12)");
  }

  // تحديد مسارات
  const templatePath = resolveTemplatePath();
  const projectRoot = path.resolve(__dirname, "..");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  const baseWb = new ExcelJS.Workbook();
  await baseWb.xlsx.readFile(templatePath);

  const extractYearNumber = (value?: string | null): number | null => {
    if (!value) return null;
    const match = String(value).match(/\d{4}/);
    if (!match) return null;
    return Number.parseInt(match[0], 10);
  };

  const fallbackYear = extractYearNumber(payload.year) ?? new Date().getUTCFullYear();

  const inferredYearByMonth = new Map<number, number>();
  (payload.attendance ?? []).forEach((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) return;
    const monthValue = date.getUTCMonth() + 1;
    if (!uniqueMonths.includes(monthValue)) return;
    if (!inferredYearByMonth.has(monthValue)) {
      inferredYearByMonth.set(monthValue, date.getUTCFullYear());
    }
  });

  const attendanceMaps = new Map<number, Map<string, Map<number, string>>>();
  uniqueMonths.forEach((monthValue) => {
    const inferredYear = inferredYearByMonth.get(monthValue);
    const allowedYears = inferredYear ? new Set([inferredYear]) : undefined;
    attendanceMaps.set(monthValue, buildAttendanceMap(payload.attendance ?? [], monthValue, allowedYears));
  });

  // تجميع الطلاب حسب الصف
  const studentsByClass = new Map<string, AttendanceStudent[]>();
  for (const s of payload.students) {
    const list = studentsByClass.get(s.classId) ?? [];
    list.push(s);
    studentsByClass.set(s.classId, list);
  }

  // نبدأ ملفًا جديدًا من القالب (لمنع تغيير القالب الأصلي في الذاكرة)
  const outWb = new ExcelJS.Workbook();

  const sanitizeSheetName = (raw: string) => {
    const trimmed = raw.trim().replace(/[\/:?*\[\]]/g, " ");
    return trimmed.length <= 31 ? trimmed : `${trimmed.slice(0, 28)}...`;
  };

  const sheetNameCounts = new Map<string, number>();

  for (const cls of payload.classes) {
    const baseName = cls.sheetName || cls.name || "Class";
    const students = (studentsByClass.get(cls.id) ?? []).sort((a, b) => {
      const nameA = (a.fullName ?? `${a.firstName ?? ""} ${a.fatherName ?? ""} ${a.grandName ?? ""} ${a.familyName ?? ""}`).trim();
      const nameB = (b.fullName ?? `${b.firstName ?? ""} ${b.fatherName ?? ""} ${b.grandName ?? ""} ${b.familyName ?? ""}`).trim();
      return nameA.localeCompare(nameB, "ar", { sensitivity: "base" });
    });

    uniqueMonths.forEach((monthValue) => {
      const monthName = MONTH_NAME_MAP[monthValue];
      if (!monthName) {
        throw new Error(`الشهر ${monthValue} غير مدعوم في القالب الجديد`);
      }

      const templateSheet = baseWb.worksheets.find((sheet) => {
        const sheetName = sheet.name.trim();
        return sheetName === monthName.trim() || sheetName === monthName;
      });

      if (!templateSheet) {
        throw new Error(`تعذر العثور على ورقة للشهر '${monthName}' في القالب`);
      }

      const dayColumns = collectDayColumns(templateSheet);
      const monthYear = inferredYearByMonth.get(monthValue) ?? fallbackYear;
      const days = daysInMonth(monthYear, monthValue);
      const attendanceMap = attendanceMaps.get(monthValue) ?? new Map<string, Map<number, string>>();

      const rawSheetName = sanitizeSheetName(`${baseName} - ${monthName}`);
      const count = sheetNameCounts.get(rawSheetName) ?? 0;
      sheetNameCounts.set(rawSheetName, count + 1);
      const finalSheetName = count === 0 ? rawSheetName : sanitizeSheetName(`${rawSheetName} (${count + 1})`);

      const clone = outWb.addWorksheet(finalSheetName, {
        views: templateSheet.views,
        pageSetup: templateSheet.pageSetup,
        properties: templateSheet.properties,
      });

      templateSheet.eachRow({ includeEmpty: true }, (row) => {
        const outRow = clone.getRow(row.number);
        if (row.height) {
          outRow.height = row.height;
        }
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const outCell = outRow.getCell(colNumber);
          const value: any = cell.value;
          if (value && typeof value === "object") {
            if (value.richText) {
              outCell.value = value.richText.map((p: any) => p?.text ?? "").join("");
            } else if (value.formula) {
              outCell.value = value.result ?? "";
            } else if (value.text) {
              outCell.value = value.text;
            } else if (value.result !== undefined) {
              outCell.value = value.result;
            } else {
              outCell.value = "";
            }
          } else {
            outCell.value = value ?? "";
          }
          outCell.style = cell.style;
        });
        outRow.commit();
      });

      templateSheet.columns.forEach((templateColumn, idx) => {
        const col = clone.getColumn(idx + 1);
        if (templateColumn.width) {
          col.width = templateColumn.width;
        }
        col.hidden = templateColumn.hidden ?? false;
        if (templateColumn.style) {
          col.style = templateColumn.style;
        }
      });

      const merges = (templateSheet as any)?.model?.merges as string[] | undefined;
      if (Array.isArray(merges)) {
        merges.forEach((ref) => {
          try {
            clone.mergeCells(ref);
          } catch {
            /* تجاهل أخطاء الدمج */
          }
        });
      }

      const classLabel = (cls.name ?? cls.sheetName ?? "").trim();
      if (classLabel) {
        const headerCell = clone.getCell("A1");
        const currentValue = toText(headerCell.value);
        if (currentValue.includes(":")) {
          const [prefix] = currentValue.split(":");
          headerCell.value = `${prefix.trim()}: ${classLabel}`;
        } else if (currentValue.length > 0) {
          headerCell.value = `${currentValue.trim()}: ${classLabel}`;
        } else {
          headerCell.value = classLabel;
        }
      }

      const attendanceStartRow = STUDENT_START_ROW;

      students.forEach((student, idx) => {
        const attendanceRow = attendanceStartRow + idx;
        const studentAttendance = attendanceMap.get(student.id) ?? new Map<number, string>();
        fillAttendanceRow(clone, attendanceRow, idx + 1, student, dayColumns, studentAttendance, days);
      });
    });
  }

  // حفظ الملف الناتج (لا حاجة لتنظيف - الأوراق تحتوي قيمًا فقط)
  const id = nanoid(10);
  const descriptor = payload.termName
    ? payload.termName.replace(/\s+/g, "_")
    : uniqueMonths.length > 1
    ? "مجمع"
    : MONTH_NAME_MAP[uniqueMonths[0]] ?? "شهري";
  const filename = `دفتر_الحضور_${descriptor}_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);
  await outWb.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

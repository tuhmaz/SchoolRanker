import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

export interface StudentRecord {
  id?: string;
  name: string;
  class: string;
  division: string;
  nationalId?: string;
}

export interface SubjectRecord {
  id: string;
  name: string;
}

export interface DivisionRecord {
  id: string;
  division: string;
  subjects: SubjectRecord[];
}

export interface ClassRecord {
  className: string;
  divisions: DivisionRecord[];
}

export interface MainGradebookPayload {
  school?: string;
  directorate?: string;
  program?: string;
  teacherName?: string;
  town?: string;
  year?: string;
  isHomeroom?: boolean;
  homeroomClass?: string;
  classes: ClassRecord[];
  students: StudentRecord[];
}

interface WorksheetPosition {
  r: number;
  c: number;
}

// Helper to get current directory with fallback
const getCurrentDir = () => {
  if (typeof import.meta.dirname !== 'undefined') {
    return import.meta.dirname;
  }
  // Fallback for environments where import.meta.dirname is not available
  return dirname(fileURLToPath(import.meta.url));
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

const getNumericCellValue = (cell: ExcelJS.Cell): number | null => {
  const raw = cellValueToString(cell.value as ExcelJS.CellValue | undefined);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export interface MainGradebookResult {
  id: string;
  filename: string;
  exportPath: string;
}

export async function generateMainGradebook(payload: MainGradebookPayload): Promise<MainGradebookResult> {
  if (!payload || !Array.isArray(payload.classes) || !Array.isArray(payload.students)) {
    throw new Error("invalid payload");
  }

  if (payload.classes.length === 0) {
    throw new Error("لا توجد صفوف لمعالجتها");
  }
  if (payload.students.length === 0) {
    throw new Error("لا توجد بيانات طلبة لمعالجتها");
  }

  const projectRoot = path.resolve(getCurrentDir(), "..");
  const templatesDir = path.resolve(projectRoot, "templates");
  const templatePath = fs.existsSync(path.resolve(templatesDir, "mark_o.xlsx"))
    ? path.resolve(templatesDir, "mark_o.xlsx")
    : path.resolve(projectRoot, "mark_o.xlsx");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const mainSheet = workbook.worksheets[0];
  if (!mainSheet) {
    throw new Error("تعذر قراءة ورقة العمل الرئيسية من القالب");
  }

  const headerSheets = [workbook.worksheets[1], workbook.worksheets[2]];
  const SUBJECT_LABEL_COLUMN = 12; // Column "L"
  const SUBJECT_VALUE_COLUMN = 15; // Column "O" adjacent to merged label area

  const studentsByClassDivision = new Map<string, StudentRecord[]>();
  payload.students
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }))
    .forEach((student) => {
      const key = `${student.class || ""}|||${student.division || ""}`;
      const list = studentsByClassDivision.get(key) ?? [];
      list.push(student);
      studentsByClassDivision.set(key, list);
    });

  const refMap = new Map<number, { sheet: ExcelJS.Worksheet; row: number }>();
  const sheetsToSearch = [workbook.worksheets[0], workbook.worksheets[1]];

  sheetsToSearch.forEach((sheet) => {
    if (!sheet) return;
    const maxRows = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0, 500);
    for (let row = 1; row <= maxRows; row++) {
      for (const column of ["J", "K"]) {
        const numericValue = getNumericCellValue(sheet.getCell(`${column}${row}`));
        if (numericValue != null && !refMap.has(numericValue)) {
          refMap.set(numericValue, { sheet, row });
        }
      }
    }
  });

  if (refMap.size === 0) {
    throw new Error("تعذر العثور على أرقام المراجع داخل القالب");
  }

  const sortedRefs = Array.from(refMap.keys()).sort((a, b) => a - b);
  const findNextAvailableRef = (minRef: number): number | null => {
    for (const ref of sortedRefs) {
      if (ref >= minRef) return ref;
    }
    return null;
  };

  const classesAndDivisions = Array.from(
    new Set(
      payload.classes.flatMap((group) =>
        (group.divisions || []).map((division) =>
          [group.className, division.division].filter(Boolean).join(" - ").trim(),
        ),
      ),
    ),
  )
    .filter(Boolean)
    .join(", ");

  const allSubjects = Array.from(
    new Set(
      payload.classes.flatMap((group) =>
        (group.divisions || []).flatMap((division) =>
          (division.subjects || [])
            .map((subject) => subject?.name?.trim())
            .filter((name): name is string => !!name && name.length > 0),
        ),
      ),
    ),
  )
    .filter(Boolean)
    .join(", ");

  headerSheets.forEach((sheet) => {
    if (!sheet) return;
    sheet.getCell("B1").value = payload.directorate ?? "";
    sheet.getCell("B2").value = payload.town ?? "";
    sheet.getCell("B3").value = payload.school ?? "";
    sheet.getCell("B4").value = classesAndDivisions;
    sheet.getCell("B5").value = allSubjects;
    sheet.getCell("B6").value = payload.teacherName ?? "";
  });

  let lastUsedRef = 0;
  let outOfSpace = false;

  for (const group of payload.classes) {
    if (outOfSpace) break;
    for (const division of group.divisions || []) {
      if (outOfSpace) break;

      const subjects = (division.subjects || [])
        .map((subject) => subject?.name?.trim())
        .filter((name): name is string => !!name && name.length > 0);

      if (subjects.length === 0) continue;

      const studentKey = `${group.className || ""}|||${division.division || ""}`;
      const classStudents = studentsByClassDivision.get(studentKey) ?? [];
      if (classStudents.length === 0) continue;

      const studentNames = classStudents.map((student) => student.name).filter((name): name is string => !!name);

      for (const subjectName of subjects) {
        if (outOfSpace) break;

        let remainingStudents = [...studentNames];
        let studentIndex = 0;

        const targetStartRef = lastUsedRef === 0 ? 1 : lastUsedRef + 2;
        let currentRef = findNextAvailableRef(targetStartRef);

        if (currentRef === null) {
          outOfSpace = true;
          break;
        }

        while (remainingStudents.length > 0) {
          const currentSlot = refMap.get(currentRef);
          if (!currentSlot) {
            throw new Error(`تعذر تحديد الصفحة ذات الرقم المرجعي ${currentRef}`);
          }

          const { sheet, row } = currentSlot;

          const classLabel = `الصف : ${group.className ?? ""}`.trim();
          const divisionLabel = `الشعبة (${division.division ?? ""})`;
          sheet.getCell(`D${row}`).value = classLabel;
          sheet.getCell(`I${row}`).value = divisionLabel;
          sheet.getCell(row, SUBJECT_VALUE_COLUMN).value = subjectName;

          const subjectRef = findNextAvailableRef(currentRef + 1);
          if (subjectRef !== null) {
            const subjectSlot = refMap.get(subjectRef);
            if (subjectSlot) {
              subjectSlot.sheet.getCell(`D${subjectSlot.row}`).value = classLabel;
              subjectSlot.sheet.getCell(`I${subjectSlot.row}`).value = divisionLabel;
              subjectSlot.sheet.getCell(subjectSlot.row, SUBJECT_VALUE_COLUMN).value = subjectName;
            }
          }

          const studentsForPage = remainingStudents.splice(0, 25);
          const studentStartRow = row + 5;

          studentsForPage.forEach((name, index) => {
            sheet.getCell(`A${studentStartRow + index}`).value = studentIndex + index + 1;
            sheet.getCell(`B${studentStartRow + index}`).value = name;
          });

          studentIndex += studentsForPage.length;
          lastUsedRef = currentRef;

          if (remainingStudents.length > 0) {
            currentRef = findNextAvailableRef(currentRef + 2);
            if (currentRef === null) {
              outOfSpace = true;
              break;
            }
          }
        }
      }
    }
  }

  const id = nanoid(10);
  const filename = `دفتر_العلامات_الرئيسي_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);
  await workbook.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

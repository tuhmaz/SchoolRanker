import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

export interface PerformanceCoverPayload {
  directorate?: string;
  school?: string;
  teacherName?: string;
  classes?: {
    className?: string;
    divisions?: {
      id?: string;
      division?: string;
      subjects?: { id?: string; name?: string }[];
    }[];
  }[];
}

export interface PerformanceCoverResult {
  id: string;
  filename: string;
  exportPath: string;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const resolveTemplatePath = () => {
  const projectRoot = path.resolve(moduleDir, "..");
  const templateInDir = path.resolve(projectRoot, "templates", "cover_01.xlsx");
  if (fs.existsSync(templateInDir)) {
    return templateInDir;
  }
  const fallback = path.resolve(projectRoot, "cover_01.xlsx");
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  throw new Error("cover template not found (cover_01.xlsx)");
};

const ensureExportsDir = async () => {
  const projectRoot = path.resolve(moduleDir, "..");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });
  return exportsDir;
};

const buildClassesString = (payload: PerformanceCoverPayload) => {
  const entries: string[] = [];
  if (!Array.isArray(payload.classes)) return "";

  for (const group of payload.classes) {
    const className = group?.className?.trim() ?? "";
    if (!Array.isArray(group?.divisions) || group.divisions.length === 0) {
      if (className) entries.push(className);
      continue;
    }

    for (const division of group.divisions) {
      const divisionName = division?.division?.trim() ?? "";
      if (className && divisionName) {
        entries.push(`${className} - ${divisionName}`);
      } else if (className || divisionName) {
        entries.push(className || divisionName);
      }
    }
  }

  return entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("، ");
};

const buildSubjectsString = (payload: PerformanceCoverPayload) => {
  if (!Array.isArray(payload.classes)) return "";
  const subjects = new Set<string>();

  for (const group of payload.classes) {
    if (!Array.isArray(group?.divisions)) continue;
    for (const division of group.divisions) {
      if (!Array.isArray(division?.subjects)) continue;
      for (const subject of division.subjects) {
        const name = subject?.name?.trim();
        if (name) subjects.add(name);
      }
    }
  }

  return Array.from(subjects).join("، ");
};

export async function generatePerformanceCover(payload: PerformanceCoverPayload): Promise<PerformanceCoverResult> {
  if (!payload) {
    throw new Error("invalid performance cover payload");
  }

  const templatePath = resolveTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  workbook.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        const anyCell: any = cell;
        if (anyCell && (anyCell.sharedFormula || anyCell.formula || anyCell.formulaType || cell.type === ExcelJS.ValueType.Formula)) {
          const finalValue = anyCell.result ?? anyCell.text ?? anyCell.value ?? "";
          anyCell.value = finalValue ?? "";
          delete anyCell.sharedFormula;
          delete anyCell.formula;
          delete anyCell.formulaType;
        }
      });
    });
  });
  const populateSheet = (worksheet: ExcelJS.Worksheet | undefined | null) => {
    if (!worksheet) return;
    worksheet.getCell("B1").value = payload.directorate ?? "";
    worksheet.getCell("B2").value = payload.school ?? "";
    worksheet.getCell("B5").value = buildClassesString(payload);
    worksheet.getCell("B7").value = buildSubjectsString(payload);
    worksheet.getCell("B10").value = payload.teacherName ?? "";
  };

  const firstSheet = workbook.getWorksheet(1) ?? workbook.addWorksheet("Cover", { views: [{ rightToLeft: true }] });
  populateSheet(firstSheet);

  const marksSheet = workbook.getWorksheet("marks");
  const performanceSheet = workbook.getWorksheet("performance");
  populateSheet(marksSheet);
  populateSheet(performanceSheet);

  const exportsDir = await ensureExportsDir();
  const id = nanoid(10);
  const filename = `غلاف_السجلات_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);

  await workbook.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

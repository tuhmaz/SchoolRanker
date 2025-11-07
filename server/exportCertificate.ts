import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

export interface CertificateSchoolInfo {
  directorate?: string;
  town?: string;
  district?: string;
  supervisingAuthority?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolNationalId?: string;
  grade?: string;
  division?: string;
  academicYear?: string;
  homeroomTeacher?: string;
  principalName?: string;
  stampLabel?: string;
  officialDays?: string | number;
}

export interface CertificateSubjectGrade {
  name: string;
  first?: string | number | null;
  second?: string | number | null;
  average?: string | number | null;
  maxScore?: string | number | null;
  minScore?: string | number | null;
}

export interface CertificateStudent {
  id: string;
  name: string;
  serialNumber?: string;
  nationalId?: string;
  nationality?: string;
  className?: string;
  division?: string;
  birthPlace?: string;
  birthDay?: string;
  birthMonth?: string;
  birthYear?: string;
  birthDate?: string;
  religion?: string;
  address?: string;
  respect?: string;
  totalScore?: string | number | null;
  percentage?: string | number | null;
  annualResult?: string;
  absenceDays?: string | number | null;
  notes?: string;
  subjects?: CertificateSubjectGrade[];
  extraSubjects?: CertificateSubjectGrade[];
}

export interface CertificateExportPayload {
  info?: CertificateSchoolInfo;
  students: CertificateStudent[];
  variant?: "final" | "first-term";
}

export interface CertificateExportResult {
  id: string;
  filename: string;
  exportPath: string;
  studentCount: number;
}

const TEMPLATE_FILENAMES: Record<"final" | "first-term", string> = {
  final: "certificate.xlsx",
  "first-term": "certificate-f-1.xlsx",
};
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const resolveTemplatePath = (variant: "final" | "first-term"): string => {
  const projectRoot = path.resolve(moduleDir, "..");
  const templateFilename = TEMPLATE_FILENAMES[variant] ?? TEMPLATE_FILENAMES.final;
  const candidates: string[] = [
    path.resolve(projectRoot, "templates", templateFilename),
    path.resolve(projectRoot, templateFilename),
    path.resolve(projectRoot, "dist", "templates", templateFilename),
  ];

  const cwd = process.cwd();
  if (cwd && cwd !== projectRoot) {
    candidates.push(path.resolve(cwd, "templates", templateFilename));
    candidates.push(path.resolve(cwd, templateFilename));
  }

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (existing) {
    return existing;
  }

  if (templateFilename !== TEMPLATE_FILENAMES.final) {
    const fallbackFilename = TEMPLATE_FILENAMES.final;
    const fallbackCandidates: string[] = [
      path.resolve(projectRoot, "templates", fallbackFilename),
      path.resolve(projectRoot, fallbackFilename),
      path.resolve(projectRoot, "dist", "templates", fallbackFilename),
    ];
    if (cwd && cwd !== projectRoot) {
      fallbackCandidates.push(path.resolve(cwd, "templates", fallbackFilename));
      fallbackCandidates.push(path.resolve(cwd, fallbackFilename));
    }
    const fallbackExisting = fallbackCandidates.find((candidate) => fs.existsSync(candidate));
    if (fallbackExisting) {
      return fallbackExisting;
    }
  }

  throw new Error(`تعذر العثور على القالب ${templateFilename}`);
};

const ensureExportsDir = async () => {
  const projectRoot = path.resolve(moduleDir, "..");
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });
  return exportsDir;
};

const cloneDeep = <T>(value: T): T | undefined => {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as T;
};

const toBuffer = (value: any) => {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string") return Buffer.from(value, "base64");
  if (value?.data && Array.isArray(value.data)) return Buffer.from(value.data);
  return null;
};

const registerTemplateImages = (
  templateWorkbook: ExcelJS.Workbook,
  outputWorkbook: ExcelJS.Workbook,
) => {
  const templateMedia = (templateWorkbook as any).model?.media as any[] | undefined;
  const idMap = new Map<number, number>();
  if (!Array.isArray(templateMedia)) {
    return idMap;
  }

  templateMedia.forEach((item, idx) => {
    if (!item || item.type !== "image") return;
    const buffer = toBuffer(item.buffer);
    const extension = item.extension || item.mimeType?.split("/").pop() || "png";
    if (!buffer) return;
    const newId = outputWorkbook.addImage({ buffer: buffer as any, extension });
    const key = typeof item.index === "number" ? item.index : idx;
    idMap.set(key, newId);
  });

  return idMap;
};

const cloneWorksheet = (
  source: ExcelJS.Worksheet,
  target: ExcelJS.Workbook,
  name: string,
  imageIdMap?: Map<number, number>,
) => {
  const worksheet = target.addWorksheet(name, {
    properties: cloneDeep(source.properties),
    pageSetup: cloneDeep(source.pageSetup),
    views: source.views?.map((view) => cloneDeep(view) ?? view) ?? undefined,
  });

  if (source.columns?.length) {
    worksheet.columns = source.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      hidden: column.hidden,
      outlineLevel: column.outlineLevel,
      style: cloneDeep(column.style),
    }));
  }

  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = worksheet.getRow(rowNumber);
    targetRow.height = row.height;
    targetRow.outlineLevel = row.outlineLevel;
    targetRow.hidden = row.hidden;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);
      targetCell.value = cell.value;
      const clonedStyle = cloneDeep(cell.style);
      if (clonedStyle) targetCell.style = clonedStyle as ExcelJS.Style;
      const clonedAlignment = cloneDeep(cell.alignment);
      if (clonedAlignment) targetCell.alignment = clonedAlignment;
      const clonedFont = cloneDeep(cell.font);
      if (clonedFont) targetCell.font = clonedFont as ExcelJS.Font;
      const clonedBorder = cloneDeep(cell.border);
      if (clonedBorder) targetCell.border = clonedBorder as ExcelJS.Borders;
      const clonedFill = cloneDeep(cell.fill);
      if (clonedFill) targetCell.fill = clonedFill as ExcelJS.Fill;
      if (cell.numFmt) targetCell.numFmt = cell.numFmt;
      const clonedNote = cloneDeep(cell.note);
      if (clonedNote) targetCell.note = clonedNote as ExcelJS.Comment | string;
    });
  });

  const sourceModel = (source as unknown as { model?: { merges?: string[]; headerFooter?: ExcelJS.HeaderFooter } }).model;
  const merges = sourceModel?.merges ?? [];
  merges.forEach((mergeRef) => {
    worksheet.mergeCells(mergeRef);
  });

  if (sourceModel?.headerFooter) {
    worksheet.headerFooter = cloneDeep(sourceModel.headerFooter) ?? worksheet.headerFooter;
  }

  const sourceImages = typeof (source as any).getImages === "function" ? (source as any).getImages() : [];
  if (Array.isArray(sourceImages) && sourceImages.length > 0) {
    sourceImages.forEach((image: any) => {
      const range = image.range;
      if (!range || !range.tl || !range.br) return;
      const mappedImageId = imageIdMap?.get(image.imageId) ?? image.imageId;
      const anchor = {
        tl: {
          col: range.tl.col,
          row: range.tl.row,
          colOff: range.tl.colOff,
          rowOff: range.tl.rowOff,
        },
        br: {
          col: range.br.col,
          row: range.br.row,
          colOff: range.br.colOff,
          rowOff: range.br.rowOff,
        },
        ext: range.ext ? { ...range.ext } : undefined,
        editAs: range.editAs,
      };
      if ((worksheet as any).addImage) {
        (worksheet as any).addImage(mappedImageId, anchor as any);
      }
    });
  }

  return worksheet;
};

const setCellPreserveStyle = (
  sheet: ExcelJS.Worksheet,
  addr: string,
  value: ExcelJS.CellValue | undefined | null,
) => {
  if (value == null || value === "") return;
  const cell = sheet.getCell(addr);
  const prevStyle = cloneDeep(cell.style);
  const prevFont = cloneDeep(cell.font);
  const prevAlignment = cloneDeep(cell.alignment);
  const prevBorder = cloneDeep(cell.border);
  const prevFill = cloneDeep(cell.fill as ExcelJS.Fill);

  cell.value = value;

  if (prevStyle) cell.style = prevStyle as ExcelJS.Style;
  if (prevFont) cell.font = prevFont as ExcelJS.Font;
  if (prevAlignment) cell.alignment = prevAlignment;
  if (prevBorder) cell.border = prevBorder as ExcelJS.Borders;
  if (prevFill) cell.fill = prevFill as ExcelJS.Fill;
};

const normalizeText = (value?: string | number | null) => {
  if (value == null) return "";
  const text = String(value).trim();
  return text;
};

const parseNumeric = (value?: string | number | null): number | null => {
  if (value == null) return null;
  const text = normalizeText(value);
  if (!text) return null;
  const normalized = text
    .replace(/[^0-9.,-]/g, "")
    .replace(/,/g, ".")
    .trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number) => {
  return value.toFixed(1).replace(/\.0$/, "");
};

const aggregateSubjectTotals = (
  subjects: CertificateSubjectGrade[] | undefined,
  variant: "final" | "first-term",
) => {
  let obtained = 0;
  let max = 0;
  if (!subjects) return { obtained, max };

  subjects.forEach((subject) => {
    let obtainedScore: number | null = null;
    if (variant === "first-term") {
      obtainedScore = parseNumeric(subject.first);
    } else {
      obtainedScore = parseNumeric(subject.average)
        ?? parseNumeric(subject.second)
        ?? parseNumeric(subject.first);
    }

    if (obtainedScore != null) {
      obtained += obtainedScore;
      const maxVal = parseNumeric(subject.maxScore);
      if (maxVal != null) {
        max += maxVal;
      }
    }
  });

  return { obtained, max };
};

const SHEET_NAME_MAX_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[\\/*?:\[\]]/g;

const sanitizeSheetNamePart = (value?: string | number | null) => {
  const text = normalizeText(value);
  if (!text) return undefined;
  const cleaned = text.replace(INVALID_SHEET_NAME_CHARS, "").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
};

const truncateSheetName = (value: string) => {
  if (value.length <= SHEET_NAME_MAX_LENGTH) {
    return value;
  }
  return value.slice(0, SHEET_NAME_MAX_LENGTH).trim();
};

const createUniqueSheetName = (
  rawParts: Array<string | number | null | undefined>,
  fallback: string,
  usedNames: Set<string>,
) => {
  const parts = rawParts
    .map((part) => sanitizeSheetNamePart(part))
    .filter((part): part is string => Boolean(part));
  const fallbackName = sanitizeSheetNamePart(fallback) ?? "شهادة";
  let baseName = parts.length > 0 ? parts.join(" - ") : fallbackName;
  baseName = truncateSheetName(baseName) || fallbackName;

  let candidate = baseName;
  let counter = 1;
  while (usedNames.has(candidate)) {
    const suffix = ` (${counter})`;
    const trimmedBase = truncateSheetName(baseName.slice(0, Math.max(0, SHEET_NAME_MAX_LENGTH - suffix.length)).trim());
    candidate = `${trimmedBase}${suffix}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
};

const getCellLabel = (cell: ExcelJS.Cell): string => {
  if (!cell || cell.value == null) return "";
  if (typeof cell.value === "string") {
    return cell.value.trim();
  }
  return String(cell.value).trim();
};

const buildLabelValue = (rawLabel: string, value: string): string => {
  if (!rawLabel) return value;
  const colonIndex = rawLabel.indexOf(":");
  if (colonIndex >= 0) {
    const prefix = rawLabel.slice(0, colonIndex).trimEnd();
    return `${prefix} : ${value}`.trim();
  }
  return `${rawLabel.trim()} ${value}`.trim();
};

const setLabelCellValue = (sheet: ExcelJS.Worksheet, addr: string, value?: string | number | null) => {
  const text = normalizeText(value);
  if (!text) return;
  const label = getCellLabel(sheet.getCell(addr));
  const finalValue = buildLabelValue(label, text);
  setCellPreserveStyle(sheet, addr, finalValue);
};

const appendNotes = (sheet: ExcelJS.Worksheet, addr: string, lines: string[]) => {
  const validLines = lines.map((line) => normalizeText(line)).filter((line) => line.length > 0);
  if (validLines.length === 0) return;
  const cell = sheet.getCell(addr);
  const label = getCellLabel(cell);
  const baseLabel = label || "ملحوظات:";
  const colonIndex = baseLabel.indexOf(":");
  const labelWithColon = colonIndex >= 0 ? `${baseLabel.slice(0, colonIndex).trimEnd()} :` : baseLabel;
  const finalValue = `${labelWithColon}\n${validLines.join("\n")}`;
  setCellPreserveStyle(sheet, addr, finalValue);
};

const setValueCell = (sheet: ExcelJS.Worksheet, addr: string, value?: string | number | null) => {
  const text = normalizeText(value);
  if (!text) return;
  setCellPreserveStyle(sheet, addr, text);
};

const normalizeSubjectKey = (value: string) => {
  return value
    .replace(/[\s\u200f\u200e]+/g, "")
    .replace(/[\u0649]/g, "ي")
    .replace(/[\u0629]/g, "ه")
    .replace(/[\u0623\u0622\u0625]/g, "ا")
    .toLowerCase();
};

const SUBJECT_ROW_ENTRIES: Array<{ names: string[]; row: number }> = [
  { names: ["التربية الإسلامية"], row: 45 },
  { names: ["العربية لغتي", "اللغة العربية"], row: 46 },
  { names: ["اللغة الإنجليزية"], row: 47 },
  { names: ["الرياضيات"], row: 48 },
  { names: ["الدراسات الاجتماعية", "التربية الاجتماعية والوطنية"], row: 49 },
  { names: ["العلوم"], row: 50 },
  { names: ["التربية الفنية والموسيقية", "التربية الفنية", "التربية الموسيقية"], row: 51 },
  { names: ["التربية الرياضية"], row: 52 },
  { names: ["الثقافة المالية"], row: 53 },
  { names: ["التربية المهنية"], row: 54 },
  { names: ["المهارات الرقمية", "الحاسوب"], row: 55 },
  { names: ["اللغة الفرنسية"], row: 56 },
  { names: ["الدين المسيحي"], row: 57 },
];

const SUBJECT_ROW_MAP = (() => {
  const map = new Map<string, number>();
  for (const entry of SUBJECT_ROW_ENTRIES) {
    for (const name of entry.names) {
      map.set(normalizeSubjectKey(name), entry.row);
    }
  }
  return map;
})();

const formatBirthDetails = (student: CertificateStudent) => {
  const place = normalizeText(student.birthPlace);
  const dateStr = normalizeText(student.birthDate);
  const components = [
    normalizeText(student.birthDay),
    normalizeText(student.birthMonth),
    normalizeText(student.birthYear),
  ].filter(Boolean);
  const fallbackDate = components.length > 0 ? components.join("/") : "";
  const finalDate = dateStr || fallbackDate;
  return {
    place,
    date: finalDate,
  };
};

const formatGradeAndDivision = (info?: CertificateSchoolInfo) => {
  const grade = normalizeText(info?.grade);
  const division = normalizeText(info?.division);
  if (grade && division) return `${grade} / ${division}`;
  if (grade) return grade;
  if (division) return division;
  return "";
};

const populateSubjects = (
  sheet: ExcelJS.Worksheet,
  subjects: CertificateSubjectGrade[] | undefined,
  variant: "final" | "first-term",
): string[] => {
  const unmapped: string[] = [];
  if (!subjects || subjects.length === 0) return unmapped;
  for (const subject of subjects) {
    const key = normalizeSubjectKey(subject.name ?? "");
    if (!key) {
      if (subject.name) unmapped.push(subject.name);
      continue;
    }
    const row = SUBJECT_ROW_MAP.get(key);
    if (!row) {
      if (subject.name) unmapped.push(subject.name);
      continue;
    }
    const maxScoreText = normalizeText(subject.maxScore);
    let minScoreText = normalizeText(subject.minScore);
    if (!minScoreText && maxScoreText) {
      const maxNumeric = parseNumeric(subject.maxScore);
      if (maxNumeric != null) {
        const computedMin = maxNumeric / 2;
        minScoreText = Number.isInteger(computedMin)
          ? String(computedMin)
          : computedMin.toFixed(2);
      }
    }
    if (minScoreText) {
      setCellPreserveStyle(sheet, `I${row}`, minScoreText);
    }
    if (maxScoreText) {
      setCellPreserveStyle(sheet, `J${row}`, maxScoreText);
    }
    const first = normalizeText(subject.first);
    const second = normalizeText(subject.second);
    const avg = normalizeText(subject.average);
    if (variant === "first-term") {
      if (first) {
        setCellPreserveStyle(sheet, `K${row}`, first);
      }
      setCellPreserveStyle(sheet, `M${row}`, "-");
      setCellPreserveStyle(sheet, `O${row}`, first || "-");
    } else {
      if (first) setCellPreserveStyle(sheet, `K${row}`, first);
      if (second) setCellPreserveStyle(sheet, `M${row}`, second);
      if (avg) setCellPreserveStyle(sheet, `O${row}`, avg);
    }
  }
  return unmapped;
};

const populateCertificateSheet = (
  sheet: ExcelJS.Worksheet,
  info: CertificateSchoolInfo | undefined,
  student: CertificateStudent,
  variant: "final" | "first-term",
) => {
  const gradeText = normalizeText(student.className) || normalizeText(info?.grade);
  const divisionText = normalizeText(student.division) || normalizeText(info?.division);
  const gradeDivision = gradeText && divisionText ? `${gradeText} / ${divisionText}` : gradeText || divisionText;

  setValueCell(sheet, "J10", student.name);
  setValueCell(sheet, "J11", gradeDivision);
  setValueCell(sheet, "J12", student.nationality);
  const birthDetails = formatBirthDetails(student);
  setValueCell(sheet, "J14", birthDetails.place);
  setValueCell(sheet, "M14", birthDetails.date);
  setValueCell(sheet, "J15", student.religion);
  setValueCell(sheet, "J16", student.address);
  setValueCell(sheet, "J17", info?.schoolName);
  setValueCell(sheet, "J18", info?.schoolAddress || info?.town);
  setValueCell(sheet, "J19", info?.directorate);
  setValueCell(sheet, "J20", info?.district);
  setValueCell(sheet, "J21", info?.supervisingAuthority);
  setValueCell(sheet, "J22", info?.schoolPhone);
  setValueCell(sheet, "J23", info?.schoolNationalId);

  // Lower header (before subjects table)
  setValueCell(sheet, "I40", student.name);
  setValueCell(sheet, "I41", gradeDivision);

  const unmappedMain = populateSubjects(sheet, student.subjects, variant);
  const unmappedExtra = populateSubjects(sheet, student.extraSubjects, variant);
  const unmappedSubjects = [...unmappedMain, ...unmappedExtra];

  const annualResult = normalizeText(student.annualResult);
  if (annualResult) {
    const normalized = annualResult.replace(/\s+/g, " ");
    if (normalized.includes("ناجح")) {
      setValueCell(sheet, "E61", "X");
    } else if (normalized.includes("مكمل")) {
      setValueCell(sheet, "E64", "X");
    } else if (normalized.includes("يبقى")) {
      setValueCell(sheet, "E67", "X");
    }
  }

  const officialDays = normalizeText(info?.officialDays);
  if (officialDays) setCellPreserveStyle(sheet, "N59", officialDays);
  const absence = normalizeText(student.absenceDays);
  if (absence) setCellPreserveStyle(sheet, "N60", absence);

  const totalsMain = aggregateSubjectTotals(student.subjects, variant);
  const totalsExtra = aggregateSubjectTotals(student.extraSubjects, variant);
  const totalObtained = totalsMain.obtained + totalsExtra.obtained;
  const totalMax = totalsMain.max + totalsExtra.max;

  const existingPercentageText = normalizeText(student.percentage);
  const existingPercentageNumeric = parseNumeric(existingPercentageText);

  let percentageToSet: string | undefined;
  if (existingPercentageNumeric != null && existingPercentageNumeric > 0) {
    percentageToSet = existingPercentageText;
  } else if (totalMax > 0) {
    const computed = (totalObtained / totalMax) * 100;
    percentageToSet = formatNumber(computed);
  }

  if (percentageToSet) {
    setValueCell(sheet, "G69", percentageToSet);
  }

  const notes: string[] = [];
  if (student.respect) {
    notes.push(`احترام النظام: ${normalizeText(student.respect)}`);
  }
  if (student.notes) {
    notes.push(normalizeText(student.notes));
  }
  if (unmappedSubjects.length > 0) {
    notes.push(`مواد إضافية: ${unmappedSubjects.join(", ")}`);
  }
  appendNotes(sheet, "C25", notes);

  if (info?.homeroomTeacher) {
    setLabelCellValue(sheet, "B70", info.homeroomTeacher);
  }
  if (info?.principalName) {
    setLabelCellValue(sheet, "L70", info.principalName);
  }
  if (info?.stampLabel) {
    setLabelCellValue(sheet, "I70", info.stampLabel);
  }
};

export const generateCertificateWorkbook = async (
  payload: CertificateExportPayload,
): Promise<CertificateExportResult> => {
  if (!payload || !Array.isArray(payload.students) || payload.students.length === 0) {
    throw new Error("لا توجد بيانات طلبة لتوليد الشهادات");
  }

  const variant = payload.variant ?? "final";
  const templatePath = resolveTemplatePath(variant);
  const exportsDir = await ensureExportsDir();

  const templateWorkbook = new ExcelJS.Workbook();
  await templateWorkbook.xlsx.readFile(templatePath);

  const templateSheets = templateWorkbook.worksheets;
  if (!templateSheets || templateSheets.length === 0) {
    throw new Error("قالب الشهادة لا يحتوي على أوراق عمل");
  }

  const outWorkbook = new ExcelJS.Workbook();
  outWorkbook.views = templateWorkbook.views?.map((view) => ({ ...view }));
  const imageIdMap = registerTemplateImages(templateWorkbook, outWorkbook);
  const usedSheetNames = new Set<string>();

  payload.students.forEach((student, index) => {
    const fallbackStudentName = `طالب_${index + 1}`;
    const studentNamePart = sanitizeSheetNamePart(student.name) ?? fallbackStudentName;

    templateSheets.forEach((sheet, sheetIndex) => {
      const sheetLabel = sanitizeSheetNamePart(sheet.name) ?? `صفحة ${sheetIndex + 1}`;
      const nameParts = sheetIndex === 0 ? [studentNamePart] : [studentNamePart, sheetLabel];
      const sheetName = createUniqueSheetName(nameParts, `${fallbackStudentName}_${sheetIndex + 1}`, usedSheetNames);
      const cloned = cloneWorksheet(sheet, outWorkbook, sheetName, imageIdMap);
      if (sheetIndex === 0) {
        populateCertificateSheet(cloned, payload.info, student, variant);
      } else {
        populateCertificateSheet(cloned, payload.info, student, variant);
      }
    });
  });

  const id = nanoid(10);
  const filename = `شهادات_الطلبة_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);
  await outWorkbook.xlsx.writeFile(exportPath);

  return { id, filename, exportPath, studentCount: payload.students.length };
};

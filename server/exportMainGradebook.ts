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
  templatePreference?: "lower" | "upper";
  classes: ClassRecord[];
  students: StudentRecord[];
  gradebook?: {
    byGroup?: Record<
      string,
      {
        className?: string;
        division?: string;
        subject?: string;
        gradesByStudentId?: Record<
          string,
          {
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
            eval1?: number | null;
            eval2?: number | null;
            eval3?: number | null;
            final?: number | null;
          }
        >;
      }
    >;
  };
}

interface WorksheetPosition {
  r: number;
  c: number;
  exportPath: string;
}

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

const normalizeArabicDigits = (value: string): string => {
  return value.replace(/[\u0660-\u0669]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit);
};

// ترتيب الكلمات المفتاحية من الأطول للأقصر لتجنب التطابقات الجزئية
// مثلاً: "ثاني ثانوي" يجب أن يُفحص قبل "ثاني" لتجنب الخلط بين الصف الثاني والثاني ثانوي
const GRADE_KEYWORDS: Array<{ grade: number; keywords: string[] }> = [
  { grade: 12, keywords: ["ثاني ثانوي", "الثاني ثانوي", "ثاني عشر", "الثاني عشر", "الصف الثاني عشر", "صف ثاني ثانوي", "12"] },
  { grade: 11, keywords: ["اول ثانوي", "الاول ثانوي", "حادي عشر", "الحادي عشر", "الصف الحادي عشر", "صف اول ثانوي", "11"] },
  { grade: 10, keywords: ["العاشر", "عاشر", "الصف العاشر", "صف عاشر", "10"] },
  { grade: 9, keywords: ["التاسع", "تاسع", "الصف التاسع", "صف تاسع", "9"] },
  { grade: 8, keywords: ["الثامن", "ثامن", "الصف الثامن", "صف ثامن", "8"] },
  { grade: 7, keywords: ["السابع", "سابع", "الصف السابع", "صف سابع", "7"] },
  { grade: 6, keywords: ["السادس", "سادس", "الصف السادس", "صف سادس", "6"] },
  { grade: 5, keywords: ["الخامس", "خامس", "الصف الخامس", "صف خامس", "5"] },
  { grade: 4, keywords: ["الرابع", "رابع", "الصف الرابع", "صف رابع", "4"] },
  { grade: 3, keywords: ["الثالث", "ثالث", "الصف الثالث", "صف ثالث", "3"] },
  { grade: 2, keywords: ["الثاني", "ثاني", "الصف الثاني", "صف ثاني", "2"] },
  { grade: 1, keywords: ["الاول", "اول", "الصف الاول", "صف اول", "1"] },
  { grade: 0, keywords: ["روضة", "رياض الاطفال", "الروضة", "صف روضة", "kg2", "kg 2", "kg", "kg1", "0"] },
];

const normalizeClassName = (className: string): string => {
  return className
    .toLowerCase()
    .replace(/[\u0660-\u0669]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit)
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06FF\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractGradeLevel = (className?: string): number | null => {
  if (!className) return null;
  const normalized = normalizeClassName(className);
  if (!normalized) return null;

  // البحث عن الكلمات المفتاحية من الأطول للأقصر لتجنب التطابقات الجزئية
  // مثلاً: "ثاني ثانوي" يجب مطابقته قبل "ثاني" فقط
  for (const { grade, keywords } of GRADE_KEYWORDS) {
    // ترتيب الكلمات المفتاحية حسب الطول (الأطول أولاً)
    const sortedKeywords = keywords.slice().sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (normalized.includes(keyword)) {
        return grade;
      }
    }
  }

  // إذا لم نجد تطابق، نحاول استخراج الرقم
  const digitMatch = normalized.match(/\b(1[0-2]|[0-9])\b/);
  if (digitMatch) {
    const parsed = Number.parseInt(digitMatch[1], 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const LOWER_LEVEL_KEYWORDS = [
  "روضه",
  "روضة",
  "رياضالاطفال",
  "رياضالاطفال",
  "kg",
  "كيجي",
  "تمهيدي",
];

const LOWER_ELEMENTARY_KEYWORDS = [
  "الاول",
  "اول",
  "الثاني",
  "ثاني",
  "الثالث",
  "ثالث",
];

const isLowerLevelClassName = (className?: string): boolean => {
  if (!className) return false;
  const normalized = normalizeClassName(className).replace(/\s+/g, '');
  if (!normalized) return false;

  if (LOWER_LEVEL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (
    LOWER_ELEMENTARY_KEYWORDS.some(
      (keyword) => normalized.includes(keyword) && !normalized.includes('ثانوي'),
    )
  ) {
    return true;
  }

  const digitMatch = normalized.match(/\b(0|1|2|3)\b/);
  if (digitMatch && !normalized.includes('ثانوي')) {
    return true;
  }

  return false;
};

const selectTemplateFilename = (classes: ClassRecord[]): string => {
  const totalClasses = classes.length;
  const detectedGrades = classes
    .map((group) => extractGradeLevel(group?.className))
    .filter((grade): grade is number => grade != null);

  const hasUpperGrades = detectedGrades.some((grade) => grade >= 4);
  if (hasUpperGrades) {
    return "alem_a.xlsx";
  }

  const allDetectedAreLower =
    detectedGrades.length > 0 && detectedGrades.every((grade) => grade <= 3);
  if (allDetectedAreLower && detectedGrades.length === totalClasses) {
    return "alem_b.xlsx";
  }

  return "alem_a.xlsx";
};

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
  const normalized = normalizeArabicDigits(raw);
  const cleaned = normalized.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const REFERENCE_LABEL_PATTERN = /[–—-]\s*([0-9]{1,4})\s*[–—-]/;

const extractReferenceNumberFromLabel = (value?: string): number | null => {
  if (!value) return null;
  const normalized = normalizeArabicDigits(value);
  const match = normalized.match(REFERENCE_LABEL_PATTERN);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const collectHeaderReferenceNumbers = (
  sheet: ExcelJS.Worksheet | undefined,
  allRefs: Array<{ refNumber: number; sheet: ExcelJS.Worksheet; row: number }>,
): number => {
  if (!sheet) return 0;
  let added = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const refNumber = extractReferenceNumberFromLabel(
        cellValueToString(cell.value as ExcelJS.CellValue | undefined),
      );
      if (refNumber != null) {
        allRefs.push({ refNumber, sheet, row: rowNumber });
        added++;
      }
    });
  });
  return added;
};

// دالة مساعدة: تعيين قيمة الخلية مع الحفاظ على التنسيق
const setCellPreserveStyle = (sheet: ExcelJS.Worksheet, addr: string | [number, number], value: ExcelJS.CellValue) => {
  const cell = typeof addr === "string" ? sheet.getCell(addr) : sheet.getCell(addr[0], addr[1]);
  const prevStyle = cell.style ? { ...cell.style } : undefined;
  const prevFont = cell.font ? { ...cell.font } : undefined;
  const prevAlignment = cell.alignment ? { ...cell.alignment } : undefined;
  const prevBorder = cell.border ? { ...cell.border } : undefined;
  const prevFill = cell.fill ? { ...(cell.fill as any) } : undefined;

  cell.value = value;

  if (prevStyle) cell.style = prevStyle;
  if (prevFont) cell.font = prevFont as ExcelJS.Font;
  if (prevAlignment) cell.alignment = prevAlignment;
  if (prevBorder) cell.border = prevBorder;
  if (prevFill) cell.fill = prevFill as ExcelJS.Fill;
};

const normalizeKeyPart = (value: unknown, fallback: string) => {
  const text = value != null ? String(value).trim() : "";
  return text.length > 0 ? text : fallback;
};

const buildGroupKey = (className: unknown, division: unknown, subject: unknown) =>
  `${normalizeKeyPart(className, "غير محدد")}|||${normalizeKeyPart(division, "بدون شعبة")}|||${normalizeKeyPart(subject, "غير محدد")}`;

const coerceMark = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(100, value));
  return clamped;
};

const shouldOverwriteComputedCell = (cell: ExcelJS.Cell): boolean => {
  const value = cell.value as ExcelJS.CellValue | undefined;
  if (value == null) return true;
  if (typeof value === "object") {
    const anyValue = value as any;
    const formula = typeof anyValue.formula === "string" ? anyValue.formula : typeof anyValue.sharedFormula === "string" ? anyValue.sharedFormula : "";
    if (formula.includes("#REF!")) return true;
    return false;
  }
  return true;
};

// دالة شاملة: نسخ جميع إعدادات القالب إلى الملف الناتج
const preserveTemplateSettings = (templateWorkbook: ExcelJS.Workbook, outputWorkbook: ExcelJS.Workbook) => {
  // نسخ إعدادات المصنف العامة
  if (templateWorkbook.properties) {
    outputWorkbook.properties = { ...templateWorkbook.properties };
  }

  // نسخ إعدادات كل ورقة عمل باستخدام حلقة for
  for (let index = 0; index < templateWorkbook.worksheets.length; index++) {
    const templateSheet = templateWorkbook.worksheets[index];
    const outputSheet = outputWorkbook.worksheets[index];
    if (!outputSheet || !templateSheet) continue;
    
    // 1. نسخ أبعاد الصفوف
    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (row.height !== undefined) {
        const outputRow = outputSheet.getRow(rowNumber);
        outputRow.height = row.height;
      }
    });
    
    // 2. نسخ أبعاد الأعمدة
    if (templateSheet.columns && Array.isArray(templateSheet.columns)) {
      templateSheet.columns.forEach((templateCol, colIndex) => {
        if (templateCol && colIndex >= 0) {
          const colNumber = colIndex + 1;
          const outputCol = outputSheet.getColumn(colNumber);
          if (templateCol.width !== undefined) outputCol.width = templateCol.width;
          if (templateCol.style) outputCol.style = { ...templateCol.style };
          if (templateCol.hidden !== undefined) outputCol.hidden = templateCol.hidden;
          if (templateCol.outlineLevel !== undefined) outputCol.outlineLevel = templateCol.outlineLevel;
        }
      });
    }
    
    // 3. نسخ إعدادات الطباعة (pageSetup)
    if (templateSheet.pageSetup) {
      const adjustedScale = 90;
      outputSheet.pageSetup = {
        ...templateSheet.pageSetup,
        margins: templateSheet.pageSetup.margins ? { ...templateSheet.pageSetup.margins } : undefined,
        orientation: templateSheet.pageSetup.orientation,
        paperSize: templateSheet.pageSetup.paperSize,
        scale: adjustedScale,
        fitToPage: false,
        fitToWidth: templateSheet.pageSetup.fitToWidth,
        fitToHeight: templateSheet.pageSetup.fitToHeight,
        blackAndWhite: templateSheet.pageSetup.blackAndWhite,
        draft: templateSheet.pageSetup.draft,
        cellComments: templateSheet.pageSetup.cellComments,
        errors: templateSheet.pageSetup.errors,
        horizontalDpi: templateSheet.pageSetup.horizontalDpi,
        verticalDpi: templateSheet.pageSetup.verticalDpi,
        horizontalCentered: templateSheet.pageSetup.horizontalCentered,
        verticalCentered: templateSheet.pageSetup.verticalCentered,
      };
      
      // الحفاظ على حدود الطباعة من القالب مع تنقية بسيطة
      const tplAreaRaw = (templateSheet.pageSetup as any)?.printArea;
      if (tplAreaRaw && typeof tplAreaRaw === 'string') {
        const firstRange = tplAreaRaw.split(',')[0].trim();
        const sanitized = firstRange.replace(/\$/g, '');
        outputSheet.pageSetup.printArea = sanitized;
      }
    }
    
    // 4. نسخ إعدادات العرض (views)
    if (templateSheet.views && templateSheet.views.length > 0) {
      const sanitizedViews = templateSheet.views.map((v: any) => {
        const nv: any = {};
        if (v.state && (v.state === 'normal' || v.state === 'frozen' || v.state === 'split')) nv.state = v.state;
        if (typeof v.rightToLeft !== 'undefined') nv.rightToLeft = v.rightToLeft;
        if (typeof v.activeCell !== 'undefined') nv.activeCell = v.activeCell;
        if (typeof v.showRuler !== 'undefined') nv.showRuler = v.showRuler;
        if (typeof v.showRowColHeaders !== 'undefined') nv.showRowColHeaders = v.showRowColHeaders;
        if (typeof v.showGridLines !== 'undefined') nv.showGridLines = v.showGridLines;
        if (typeof v.zoomScale !== 'undefined') nv.zoomScale = v.zoomScale;
        if (typeof v.zoomScaleNormal !== 'undefined') nv.zoomScaleNormal = v.zoomScaleNormal;
        if (typeof v.xSplit !== 'undefined') nv.xSplit = v.xSplit;
        if (typeof v.ySplit !== 'undefined') nv.ySplit = v.ySplit;
        if (typeof v.topLeftCell !== 'undefined') nv.topLeftCell = v.topLeftCell;
        return nv;
      });
      outputSheet.views = sanitizedViews as any;
    }
    
    // 5. نسخ خصائص الورقة العامة
    if (templateSheet.properties) {
      outputSheet.properties = { ...templateSheet.properties };
    }
    
    // 6. نسخ إعدادات التجميد (state)
    if (templateSheet.state) {
      outputSheet.state = templateSheet.state;
    }
  }
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

  const originalClasses = payload.classes;
  const originalStudents = payload.students;

  const filterByPreference = (classes: ClassRecord[]): ClassRecord[] => {
    if (payload.templatePreference === "lower") {
      return classes.filter((group) => {
        const grade = extractGradeLevel(group?.className);
        if (grade == null) return isLowerLevelClassName(group?.className);
        return grade <= 3;
      });
    }
    if (payload.templatePreference === "upper") {
      return classes.filter((group) => {
        const grade = extractGradeLevel(group?.className);
        if (grade == null) {
          return !isLowerLevelClassName(group?.className);
        }
        return grade >= 4; // يشمل من الرابع حتى الثاني ثانوي
      });
    }
    return classes;
  };

  const classes = filterByPreference(originalClasses).slice();

  const gradeComparator = (a: ClassRecord, b: ClassRecord) => {
    const gradeA = extractGradeLevel(a?.className) ?? Number.POSITIVE_INFINITY;
    const gradeB = extractGradeLevel(b?.className) ?? Number.POSITIVE_INFINITY;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return String(a?.className || "").localeCompare(String(b?.className || ""), "ar", { sensitivity: "base" });
  };

  // ترتيب الصفوف حسب الدرجة (من الأصغر إلى الأكبر)
  // الصفوف الدنيا: روضة → ثالث
  // الصفوف العليا: رابع → ثاني ثانوي
  if (payload.templatePreference === "lower" || payload.templatePreference === "upper") {
    classes.sort(gradeComparator);

    // ترتيب الشعب والمواد داخل كل صف
    classes.forEach(classRecord => {
      if (classRecord.divisions && classRecord.divisions.length > 1) {
        // ترتيب الشعب أبجدياً (أ، ب، ج، ...)
        classRecord.divisions.sort((a, b) => {
          const divA = String(a?.division || "");
          const divB = String(b?.division || "");
          return divA.localeCompare(divB, "ar", { sensitivity: "base" });
        });
      }

      // ترتيب المواد داخل كل شعبة أبجدياً
      classRecord.divisions?.forEach(division => {
        if (division.subjects && division.subjects.length > 1) {
          division.subjects.sort((a, b) => {
            const subjectA = String(a?.name || "");
            const subjectB = String(b?.name || "");
            return subjectA.localeCompare(subjectB, "ar", { sensitivity: "base" });
          });
        }
      });
    });
  }
  if (classes.length === 0) {
    throw new Error("لا توجد صفوف مناسبة للخيار المحدد");
  }

  const classNameLookup = new Map<string, string>();
  classes.forEach((group) => {
    const normalized = normalizeClassName(group?.className || "");
    if (normalized) {
      classNameLookup.set(normalized, group.className);
    }
  });

  const allowedNormalizedClassNames = new Set(classNameLookup.keys());

  const students = originalStudents.filter((student) => {
    const studentClass = student.class || "";
    const normalized = normalizeClassName(studentClass);
    const grade = extractGradeLevel(studentClass);

    if (payload.templatePreference === "lower") {
      if (grade != null && grade >= 4) return false;
      if (grade == null && !isLowerLevelClassName(studentClass)) return false;
      return allowedNormalizedClassNames.has(normalized);
    }

    if (payload.templatePreference === "upper") {
      if (grade == null) {
        if (isLowerLevelClassName(studentClass)) return false;
        return allowedNormalizedClassNames.has(normalized);
      }
      if (grade < 4) return false; // يشمل من الرابع فما فوق
      return allowedNormalizedClassNames.has(normalized);
    }

    if (allowedNormalizedClassNames.size === 0) {
      return true;
    }
    return allowedNormalizedClassNames.has(normalized);
  });

  if (students.length === 0) {
    throw new Error("لا توجد بيانات طلبة مناسبة للخيار المحدد");
  }

  const projectRoot = path.resolve(getCurrentDir(), "..");
  const templateFilename =
    payload.templatePreference === "lower"
      ? "alem_b.xlsx"
      : payload.templatePreference === "upper"
        ? "alem_a.xlsx"
        : selectTemplateFilename(classes ?? []);
  const candidateTemplates = [
    path.resolve(projectRoot, "templates", templateFilename),
    path.resolve(projectRoot, templateFilename),
  ];

  if (process.cwd() !== projectRoot) {
    candidateTemplates.push(path.resolve(process.cwd(), "templates", templateFilename));
    candidateTemplates.push(path.resolve(process.cwd(), templateFilename));
  }

  const templatePath = candidateTemplates.find((candidate) => fs.existsSync(candidate));
  if (!templatePath) {
    throw new Error(`تعذر العثور على القالب ${templateFilename}`);
  }
  const exportsDir = path.resolve(projectRoot, "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const mainSheet = workbook.worksheets[0];
  if (!mainSheet) {
    throw new Error("تعذر قراءة ورقة العمل الرئيسية من القالب");
  }

  const SUBJECT_LABEL_COLUMN = 12; // Column "L"
  const SUBJECT_VALUE_COLUMN = 15; // Column "O" adjacent to merged label area
  const term1Columns = { e1: "D", e2: "E", e3: "F", e4: "G", result: "H" };
  const term2Columns = { e1: "L", e2: "M", e3: "N", e4: "O", result: "P", annual: "Q", completion: "R" };

  const studentsByClassDivision = new Map<string, StudentRecord[]>();
  students
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }))
    .forEach((student) => {
      const normalized = normalizeClassName(student.class || "");
      const canonicalClassName = classNameLookup.get(normalized) ?? student.class;
      const key = `${canonicalClassName || ""}|||${student.division || ""}`;
      const list = studentsByClassDivision.get(key) ?? [];
      list.push(student);
      studentsByClassDivision.set(key, list);
    });

  // جمع كل المراجع من جميع الشيتات (بما في ذلك المكررات)
  const allRefsArray: Array<{ refNumber: number; sheet: ExcelJS.Worksheet; row: number }> = [];
  const sheetsToSearch = [workbook.worksheets[0], workbook.worksheets[1]];

  sheetsToSearch.forEach((sheet) => {
    if (!sheet) return;
    // زيادة الحد الأقصى للبحث ليشمل جميع صفوف القالب
    const maxRows = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0, 3200);

    for (let row = 1; row <= maxRows; row++) {
      for (const column of ["J", "K"]) {
        const numericValue = getNumericCellValue(sheet.getCell(`${column}${row}`));
        if (numericValue != null) {
          allRefsArray.push({ refNumber: numericValue, sheet, row });
        }
      }
    }
  });

  if (allRefsArray.length === 0) {
    sheetsToSearch.forEach((sheet) => {
      collectHeaderReferenceNumbers(sheet, allRefsArray);
    });
  }
  if (allRefsArray.length === 0) {
    throw new Error("تعذر العثور على أرقام المراجع داخل القالب");
  }

  // إزالة المكررات: نحتفظ بأول ظهور لكل رقم مرجع فريد
  const uniqueRefs = new Map<number, typeof allRefsArray[0]>();
  allRefsArray.forEach(ref => {
    if (!uniqueRefs.has(ref.refNumber)) {
      uniqueRefs.set(ref.refNumber, ref);
    }
  });

  // ترتيب حسب رقم المرجع، وعند التساوي حسب الشيت ثم الصف
  const sortedUniqueRefs = Array.from(uniqueRefs.values()).sort((a, b) => {
    // أولاً: حسب رقم المرجع
    const refCompare = a.refNumber - b.refNumber;
    if (refCompare !== 0) return refCompare;
    // ثانياً: حسب اسم الشيت (في حالة المكررات النادرة)
    const sheetCompare = a.sheet.name.localeCompare(b.sheet.name);
    if (sheetCompare !== 0) return sheetCompare;
    // ثالثاً: حسب رقم الصف
    return a.row - b.row;
  });

  // إنشاء refMap باستخدام أرقام المراجع الفعلية
  const refMap = new Map<number, { sheet: ExcelJS.Worksheet; row: number }>();
  sortedUniqueRefs.forEach((ref) => {
    refMap.set(ref.refNumber, { sheet: ref.sheet, row: ref.row });
  });

  const sortedRefs = Array.from(refMap.keys()).sort((a, b) => a - b);

  let lastUsedRefIndex = -1;

  const findNextAvailableRef = (): number | null => {
    // البحث البسيط والمباشر: الانتقال إلى المرجع التالي في الترتيب التسلسلي
    if (lastUsedRefIndex + 1 < sortedRefs.length) {
      lastUsedRefIndex++;
      return sortedRefs[lastUsedRefIndex];
    } else {
      return null;
    }
  };

  for (const group of classes) {
    for (const division of group.divisions || []) {
      const subjects = (division.subjects || [])
        .map((subject) => subject?.name?.trim())
        .filter((name): name is string => !!name && name.length > 0);

      if (subjects.length === 0) {
        continue;
      }

      const studentKey = `${group.className || ""}|||${division.division || ""}`;
      const classStudents = studentsByClassDivision.get(studentKey) ?? [];
      if (classStudents.length === 0) {
        continue;
      }

      for (const subjectName of subjects) {

        const groupKey = buildGroupKey(group.className, division.division, subjectName);
        const groupEntry = payload.gradebook?.byGroup?.[groupKey];
        const gradesByStudentId = groupEntry?.gradesByStudentId ?? {};

        let remainingStudents = [...classStudents];
        let studentIndex = 0;

        while (remainingStudents.length > 0) {
          // أخذ المرجع التالي المتاح للطلاب
          const studentsRef = findNextAvailableRef();
          if (studentsRef === null) {
            break;
          }

          const studentsSlot = refMap.get(studentsRef);
          if (!studentsSlot) {
            throw new Error(`تعذر تحديد الصفحة ذات الرقم المرجعي ${studentsRef}`);
          }

          // كتابة الطلاب
          const { sheet, row } = studentsSlot;

          const classLabel = `الصف : ${group.className ?? ""}`.trim();
          const divisionLabel = `الشعبة (${division.division ?? ""})`;
          const headerRow = row + 1;

          setCellPreserveStyle(sheet, `D${headerRow}`, classLabel);
          setCellPreserveStyle(sheet, `I${headerRow}`, divisionLabel);

          const studentsForPage = remainingStudents.splice(0, 25);
          const studentStartRow = headerRow + 5;

          studentsForPage.forEach((student, index) => {
            const name = student.name;
            const studentId = student.id;
            const row = studentStartRow + index;
            setCellPreserveStyle(sheet, `A${studentStartRow + index}`, studentIndex + index + 1);
            setCellPreserveStyle(sheet, `B${studentStartRow + index}`, name);

            if (studentId) {
              const grades = gradesByStudentId[studentId] ?? {};
              const t1Eval1 = coerceMark((grades as any).t1Eval1);
              const t1Eval2 = coerceMark((grades as any).t1Eval2);
              const t1Eval3 = coerceMark((grades as any).t1Eval3);
              const t1Eval4 = coerceMark((grades as any).t1Eval4);
              const t2Eval1 = coerceMark((grades as any).t2Eval1 ?? (grades as any).eval1);
              const t2Eval2 = coerceMark((grades as any).t2Eval2 ?? (grades as any).eval2);
              const t2Eval3 = coerceMark((grades as any).t2Eval3 ?? (grades as any).eval3);
              const t2Eval4 = coerceMark((grades as any).t2Eval4 ?? (grades as any).final);
              const completion = coerceMark((grades as any).completion);

              if (t1Eval1 != null) setCellPreserveStyle(sheet, `${term1Columns.e1}${row}`, t1Eval1);
              if (t1Eval2 != null) setCellPreserveStyle(sheet, `${term1Columns.e2}${row}`, t1Eval2);
              if (t1Eval3 != null) setCellPreserveStyle(sheet, `${term1Columns.e3}${row}`, t1Eval3);
              if (t1Eval4 != null) setCellPreserveStyle(sheet, `${term1Columns.e4}${row}`, t1Eval4);
              if (t2Eval1 != null) setCellPreserveStyle(sheet, `${term2Columns.e1}${row}`, t2Eval1);
              if (t2Eval2 != null) setCellPreserveStyle(sheet, `${term2Columns.e2}${row}`, t2Eval2);
              if (t2Eval3 != null) setCellPreserveStyle(sheet, `${term2Columns.e3}${row}`, t2Eval3);
              if (t2Eval4 != null) setCellPreserveStyle(sheet, `${term2Columns.e4}${row}`, t2Eval4);
              if (completion != null) setCellPreserveStyle(sheet, `${term2Columns.completion}${row}`, completion);

              const t1All = [t1Eval1, t1Eval2, t1Eval3, t1Eval4];
              const t2All = [t2Eval1, t2Eval2, t2Eval3, t2Eval4];
              const t1Result = t1All.every((v) => typeof v === "number") ? coerceMark(t1All.reduce((acc, v) => acc + (v ?? 0), 0)) : null;
              const t2Result = t2All.every((v) => typeof v === "number") ? coerceMark(t2All.reduce((acc, v) => acc + (v ?? 0), 0)) : null;
              const annual = t1Result != null && t2Result != null ? coerceMark(Math.round((t1Result + t2Result) / 2)) : null;

              if (t1Result != null) {
                const cell = sheet.getCell(`${term1Columns.result}${row}`);
                if (shouldOverwriteComputedCell(cell)) setCellPreserveStyle(sheet, cell.address, t1Result);
              }
              if (t2Result != null) {
                const cell = sheet.getCell(`${term2Columns.result}${row}`);
                if (shouldOverwriteComputedCell(cell)) setCellPreserveStyle(sheet, cell.address, t2Result);
              }
              if (annual != null) {
                const cell = sheet.getCell(`${term2Columns.annual}${row}`);
                if (shouldOverwriteComputedCell(cell)) setCellPreserveStyle(sheet, cell.address, annual);
              }
            }
          });

          studentIndex += studentsForPage.length;

          // أخذ المرجع التالي المتاح للمادة الدراسية
          const subjectRef = findNextAvailableRef();
          if (subjectRef === null) {
            break;
          }

          const subjectSlot = refMap.get(subjectRef);
          if (subjectSlot) {
            const subjectHeaderRow = subjectSlot.row + 1;
            const subjectDisplay = `المادة الدراسية : ${subjectName}`;
            setCellPreserveStyle(subjectSlot.sheet, [subjectHeaderRow, SUBJECT_VALUE_COLUMN], subjectDisplay);
          }
        }
      }
    }
  }

  const id = nanoid(10);
  const filename = `دفتر_العلامات_الرئيسي_${id}.xlsx`;
  const exportPath = path.resolve(exportsDir, filename);

  // حفظ جميع إعدادات القالب قبل الحفظ النهائي
  const templateWorkbook = new ExcelJS.Workbook();
  await templateWorkbook.xlsx.readFile(templatePath);
  preserveTemplateSettings(templateWorkbook, workbook);

  await workbook.xlsx.writeFile(exportPath);

  return { id, filename, exportPath };
}

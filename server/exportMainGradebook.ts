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
  { grade: 12, keywords: ["ثاني ثانوي", "الثاني ثانوي", "ثاني عشر", "الثاني عشر", "12"] },
  { grade: 11, keywords: ["اول ثانوي", "الاول ثانوي", "حادي عشر", "الحادي عشر", "11"] },
  { grade: 10, keywords: ["العاشر", "عاشر", "10"] },
  { grade: 9, keywords: ["التاسع", "تاسع", "9"] },
  { grade: 8, keywords: ["الثامن", "ثامن", "8"] },
  { grade: 7, keywords: ["السابع", "سابع", "7"] },
  { grade: 6, keywords: ["السادس", "سادس", "6"] },
  { grade: 5, keywords: ["الخامس", "خامس", "5"] },
  { grade: 4, keywords: ["الرابع", "رابع", "4"] },
  { grade: 3, keywords: ["الثالث", "ثالث", "3"] },
  { grade: 2, keywords: ["الثاني", "ثاني", "2"] },
  { grade: 1, keywords: ["الاول", "اول", "1"] },
  { grade: 0, keywords: ["روضة", "رياض الاطفال", "kg2", "kg 2", "kg", "kg1", "0"] },
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

const selectTemplateFilename = (classes: ClassRecord[]): string => {
  const totalClasses = classes.length;
  const detectedGrades = classes
    .map((group) => extractGradeLevel(group?.className))
    .filter((grade): grade is number => grade != null);

  const hasUpperGrades = detectedGrades.some((grade) => grade >= 5);
  if (hasUpperGrades) {
    return "alem_a.xlsx";
  }

  const allDetectedAreLower =
    detectedGrades.length > 0 && detectedGrades.every((grade) => grade <= 4);
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
  refMap: Map<number, { sheet: ExcelJS.Worksheet; row: number }>,
): number => {
  if (!sheet) return 0;
  let added = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const refNumber = extractReferenceNumberFromLabel(
        cellValueToString(cell.value as ExcelJS.CellValue | undefined),
      );
      if (refNumber != null && !refMap.has(refNumber)) {
        refMap.set(refNumber, { sheet, row: rowNumber });
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

// دالة شاملة: نسخ جميع إعدادات القالب إلى الملف الناتج
const preserveTemplateSettings = (templateWorkbook: ExcelJS.Workbook, outputWorkbook: ExcelJS.Workbook) => {
  console.log("🔧 Preserving template settings...");
  
  // نسخ إعدادات المصنف العامة
  if (templateWorkbook.properties) {
    outputWorkbook.properties = { ...templateWorkbook.properties };
  }
  
  // نسخ إعدادات كل ورقة عمل باستخدام حلقة for
  for (let index = 0; index < templateWorkbook.worksheets.length; index++) {
    const templateSheet = templateWorkbook.worksheets[index];
    const outputSheet = outputWorkbook.worksheets[index];
    if (!outputSheet || !templateSheet) continue;
    
    console.log(`  📄 Processing sheet ${index + 1}: ${templateSheet.name}`);
    
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
  
  console.log("✅ All template settings preserved successfully");
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
        if (grade == null) return true;
        return grade <= 4;
      });
    }
    if (payload.templatePreference === "upper") {
      return classes.filter((group) => {
        const grade = extractGradeLevel(group?.className);
        return grade != null && grade >= 5;
      });
    }
    return classes;
  };

  const classes = filterByPreference(originalClasses).slice();

  console.log("📊 Filtered classes count:", classes.length);

  const gradeComparator = (a: ClassRecord, b: ClassRecord) => {
    const gradeA = extractGradeLevel(a?.className) ?? Number.POSITIVE_INFINITY;
    const gradeB = extractGradeLevel(b?.className) ?? Number.POSITIVE_INFINITY;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return String(a?.className || "").localeCompare(String(b?.className || ""), "ar", { sensitivity: "base" });
  };

  // ترتيب الصفوف حسب الدرجة (من الأصغر إلى الأكبر)
  // الصفوف الدنيا: روضة → رابع
  // الصفوف العليا: خامس → ثاني ثانوي
  if (payload.templatePreference === "lower" || payload.templatePreference === "upper") {
    console.log("🔄 Sorting classes by grade level...");
    classes.sort(gradeComparator);
    console.log("✅ Classes sorted:", classes.map(c => `${c.className} (${extractGradeLevel(c.className)})`).join(" → "));

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

  // طباعة الترتيب النهائي للتأكد
  console.log("📚 Final class order:");
  classes.forEach((classRecord, idx) => {
    const grade = extractGradeLevel(classRecord.className);
    const divisions = classRecord.divisions?.map(d => d.division).join(", ") || "لا توجد شعب";
    console.log(`  ${idx + 1}. ${classRecord.className} (Grade ${grade ?? '?'}) - الشعب: [${divisions}]`);
  });

  const classNameLookup = new Map<string, string>();
  classes.forEach((group) => {
    const normalized = normalizeClassName(group?.className || "");
    if (normalized) {
      classNameLookup.set(normalized, group.className);
    }
  });

  const allowedNormalizedClassNames = new Set(classNameLookup.keys());

  console.log("✅ Allowed class names:", Array.from(allowedNormalizedClassNames).slice(0, 5).join(", "),
              allowedNormalizedClassNames.size > 5 ? `... (${allowedNormalizedClassNames.size} total)` : "");

  const students = originalStudents.filter((student) => {
    const studentClass = student.class || "";
    const normalized = normalizeClassName(studentClass);
    const grade = extractGradeLevel(studentClass);

    if (payload.templatePreference === "lower") {
      // استبعاد الطلاب الذين في صفوف عليا معروفة (درجة >= 5)
      if (grade != null && grade >= 5) return false;
      // قبول الطلاب في الصفوف الدنيا (درجة <= 4) أو غير المحددة
      // طالما أن اسم صفهم موجود في قائمة الصفوف المسموحة
      return allowedNormalizedClassNames.has(normalized);
    }

    if (payload.templatePreference === "upper") {
      if (grade == null || grade < 5) return false;
      return allowedNormalizedClassNames.has(normalized);
    }

    if (allowedNormalizedClassNames.size === 0) {
      return true;
    }
    return allowedNormalizedClassNames.has(normalized);
  });

  console.log(`📝 Total students: ${students.length} out of ${originalStudents.length}`);

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

  const headerSheets = [workbook.worksheets[1], workbook.worksheets[2]];
  const SUBJECT_LABEL_COLUMN = 12; // Column "L"
  const SUBJECT_VALUE_COLUMN = 15; // Column "O" adjacent to merged label area

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

  const refMap = new Map<number, { sheet: ExcelJS.Worksheet; row: number }>();
  const sheetsToSearch = [workbook.worksheets[0], workbook.worksheets[1]];

  console.log("🔍 Searching for reference numbers in template...");

  sheetsToSearch.forEach((sheet, index) => {
    if (!sheet) return;
    // زيادة الحد الأقصى للبحث ليشمل جميع صفوف القالب
    const maxRows = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0, 750);
    let foundInSheet = 0;

    for (let row = 1; row <= maxRows; row++) {
      for (const column of ["J", "K"]) {
        const numericValue = getNumericCellValue(sheet.getCell(`${column}${row}`));
        if (numericValue != null && !refMap.has(numericValue)) {
          refMap.set(numericValue, { sheet, row });
          foundInSheet++;
        }
      }
    }

    console.log(`  ✅ Sheet ${index + 1}: Found ${foundInSheet} references (${sheet.rowCount} rows scanned)`);
  });

  if (refMap.size === 0) {
    console.log("[fallback] Legacy reference columns empty. Scanning header labels...");
    sheetsToSearch.forEach((sheet, index) => {
      const added = collectHeaderReferenceNumbers(sheet, refMap);
      console.log(`  [fallback] Header scan sheet ${index + 1}: Found ${added} references via labels`);
    });
  }
  if (refMap.size === 0) {
    throw new Error("تعذر العثور على أرقام المراجع داخل القالب");
  }

  // للصفوف الدنيا: نستخدم refStep = 1 (كل مرجع)
  // للصفوف العليا: نستخدم refStep = 2 (كل مرجعين)
  const refStep = payload.templatePreference === "lower" ? 1 : 2;

  // ترتيب المراجع:
  // - للصفوف الدنيا: نرتب حسب رقم المرجع نفسه (1, 2, 3, ...) وليس حسب موقع الصف
  // - للصفوف العليا: نرتب حسب رقم المرجع أيضاً
  const sortedRefs = Array.from(refMap.keys()).sort((a, b) => a - b);

  console.log("🔢 Sorted reference numbers:", sortedRefs.slice(0, 10).join(", "), "...");
  console.log("📏 Total references available:", sortedRefs.length);
  console.log("⚙️  Using refStep:", refStep);

  const usedRefs = new Set<number>();
  const findNextAvailableRef = (minRef: number): number | null => {
    for (const ref of sortedRefs) {
      if (usedRefs.has(ref)) continue;
      if (ref >= minRef) {
        usedRefs.add(ref);
        return ref;
      }
    }
    return null;
  };

  const classesAndDivisions = Array.from(
    new Set(
      classes.flatMap((group) =>
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
      classes.flatMap((group) =>
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

  // لا نقوم بتعبئة الأوراق الثانوية للحفاظ على تصميم القالب كما هو

  let lastUsedRef: number | null = null;
  let outOfSpace = false;

  for (const group of classes) {
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

        const targetStartRef = lastUsedRef == null ? Number.NEGATIVE_INFINITY : lastUsedRef + refStep;
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
          
          // تحديد صف الرأس الفعلي بحسب النموذج
          const headerRow = row + 1;

          // تحديد مواقع الطباعة الصحيحة حسب نوع النموذج
          // الكتابة وفق مواضع النموذج الأصلي
          setCellPreserveStyle(sheet, `D${headerRow}`, classLabel); // ضمن الدمج D:H
          setCellPreserveStyle(sheet, `I${headerRow}`, divisionLabel); // خلية مفردة I
          const subjectDisplay = `المادة الدراسية : ${subjectName}`;
          setCellPreserveStyle(sheet, [headerRow, SUBJECT_VALUE_COLUMN], subjectDisplay); // ضمن الدمج O:T

          const subjectRef = findNextAvailableRef(currentRef + 1);
          if (subjectRef !== null) {
            const subjectSlot = refMap.get(subjectRef);
            if (subjectSlot) {
              const subjectHeaderRow = subjectSlot.row + 1;
              // تحديث مواقع الطباعة في الصفحة الثانية أيضاً
              if (templateFilename === "alem_b.xlsx") {
                // للصفوف الدنيا (نموذج alem_b.xlsx)
                subjectSlot.sheet.getCell(`D${subjectHeaderRow}`).value = classLabel; // ضمن الدمج D:H
                subjectSlot.sheet.getCell(`I${subjectHeaderRow}`).value = divisionLabel; // خلية مفردة I
                subjectSlot.sheet.getCell(subjectHeaderRow, SUBJECT_VALUE_COLUMN).value = subjectDisplay; // ضمن الدمج O:T
              } else {
                // للصفوف العليا - نموذج alem_a.xlsx
                subjectSlot.sheet.getCell(`D${subjectHeaderRow}`).value = classLabel;
                subjectSlot.sheet.getCell(`I${subjectHeaderRow}`).value = divisionLabel;
                subjectSlot.sheet.getCell(subjectHeaderRow, SUBJECT_VALUE_COLUMN).value = subjectDisplay;
              }
            }
          }

          const studentsForPage = remainingStudents.splice(0, 25);
          const studentStartRow = headerRow + 5; // بداية الأسماء بعد 5 صفوف من رأس الجدول

          studentsForPage.forEach((name, index) => {
            setCellPreserveStyle(sheet, `A${studentStartRow + index}`, studentIndex + index + 1);
            setCellPreserveStyle(sheet, `B${studentStartRow + index}`, name);
          });

          studentIndex += studentsForPage.length;
          lastUsedRef = currentRef;

          if (remainingStudents.length > 0) {
            const nextRef = findNextAvailableRef(currentRef + refStep);
            if (nextRef === null) {
              outOfSpace = true;
              break;
            }
            currentRef = nextRef;
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

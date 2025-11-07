import * as XLSX from "xlsx";

const TERM_LABELS = ["الفصل الأول", "الفصل الثاني", "المعدل"] as const;

export type TermKey = "first" | "second" | "average";

export interface GradebookSubject {
  name: string;
  maxScore?: string;
  minScore?: string;
}

export interface GradebookStudent {
  serial: string;
  name: string;
  nationality?: string;
  birthPlace?: string;
  birthDay?: string;
  birthMonth?: string;
  birthYear?: string;
  respect?: string;
  absenceDays?: string;
  repeatedGrades?: string;
  completionResult?: string;
  total?: string;
  percentage?: string;
  annualResult?: string;
  subjects: Record<string, Partial<Record<TermKey, string>>>;
}

export interface GradebookAnalysis {
  info: {
    directorate?: string;
    town?: string;
    school?: string;
    district?: string;
    grade?: string;
    division?: string;
    program?: string;
  };
  subjects: GradebookSubject[];
  terms: TermKey[];
  students: GradebookStudent[];
}

interface ColumnDescriptorBase {
  type: "serial" | "name" | "nationality" | "birthPlace" | "birthDay" | "birthMonth" | "birthYear" | "respect" | "absenceDays" | "repeatedGrades" | "completionResult" | "total" | "percentage" | "annualResult";
}

interface SubjectColumnDescriptor {
  type: "subject";
  subject: string;
  term: TermKey;
}

type ColumnDescriptor = ColumnDescriptorBase | SubjectColumnDescriptor | null;

type SubjectTermMeta = Map<string, Partial<Record<TermKey, number>>>;

type InfoKey = keyof GradebookAnalysis["info"];

type LabelMatcher = {
  key: InfoKey;
  regex: RegExp;
};

const INFO_LABELS: LabelMatcher[] = [
  { key: "directorate", regex: /مديرية/ },
  { key: "town", regex: /البلدة/ },
  { key: "school", regex: /المدرسة/ },
  { key: "district", regex: /اللواء/ },
  { key: "grade", regex: /^الصف[:\s]*$/ },
  { key: "division", regex: /الشعبة/ },
  { key: "program", regex: /(البرنامج|المرحلة|المسار)/ },
];

const STATIC_FIELD_MATCHERS: Array<{ key: ColumnDescriptorBase["type"]; regex: RegExp }> = [
  { key: "serial", regex: /الرقم\s*المتسلسل/ },
  { key: "name", regex: /الاس.*|الاسم/ },
  { key: "nationality", regex: /الجنسية/ },
  { key: "birthPlace", regex: /مكان\s*الولادة/ },
];

const METRIC_MATCHERS: Array<{ key: ColumnDescriptorBase["type"]; regex: RegExp }> = [
  { key: "respect", regex: /احترام\s*النظام/ },
  { key: "absenceDays", regex: /عدد\s*أيام\s*غياب/ },
  { key: "repeatedGrades", regex: /الصف.*التي\s*أعادها\s*الطالب/ },
  { key: "completionResult", regex: /النتيجة\s*بعد\s*تأدية\s*اختبارات/ },
  { key: "total", regex: /المجموع\s*العام/ },
  { key: "percentage", regex: /المعدل\s*العام\s*المئوي/ },
  { key: "annualResult", regex: /النتيجة\s*السنوية/ },
];

const TERM_MAP: Record<string, TermKey> = {
  "الفصل الأول": "first",
  "الفصل الثاني": "second",
  "المعدل": "average",
};

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value).replace(/\s+/g, " ").trim();
  return str;
}

function roundToOneDecimal(value: string): string {
  if (!value) return value;
  const numericValue = Number(value.replace(/[^\d.,-]/g, "").replace(/,/g, "."));
  if (!Number.isFinite(numericValue)) return value;
  const rounded = Math.round(numericValue * 10) / 10;
  return rounded.toFixed(1);
}

function findAdjacentValue(row: any[], index: number): string {
  for (let offset = 1; offset <= row.length; offset++) {
    const right = index + offset;
    if (right < row.length) {
      const candidate = normalizeCell(row[right]);
      if (candidate && candidate !== ":") return candidate;
    }
    const left = index - offset;
    if (left >= 0) {
      const candidate = normalizeCell(row[left]);
      if (candidate && candidate !== ":") return candidate;
    }
  }
  return "";
}

function extractInfo(rows: any[][]): GradebookAnalysis["info"] {
  const info: GradebookAnalysis["info"] = {};
  const searchRows = rows.slice(0, 20);

  for (const row of searchRows) {
    for (let col = 0; col < row.length; col++) {
      const cell = normalizeCell(row[col]);
      if (!cell) continue;

      for (const matcher of INFO_LABELS) {
        if (matcher.regex.test(cell) && info[matcher.key] == null) {
          const value = findAdjacentValue(row, col);
          if (value) {
            if (matcher.key === "division") {
              info[matcher.key] = value.replace(/^\(|\)$/g, "");
            } else {
              info[matcher.key] = value;
            }
          }
        }
      }
    }
  }

  return info;
}

function detectHeaderRow(rows: any[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const hasSerial = row.some((cell: any) => normalizeCell(cell).includes("الرقم"));
    const hasName = row.some((cell: any) => normalizeCell(cell).includes("الاس"));
    if (hasSerial && hasName) {
      return i;
    }
  }
  throw new Error("تعذر تحديد صف العناوين في ورقة جدول العلامات");
}

function matchStaticField(label: string): ColumnDescriptorBase["type"] | null {
  for (const matcher of STATIC_FIELD_MATCHERS) {
    if (matcher.regex.test(label)) {
      return matcher.key;
    }
  }
  if (/^اليوم$/.test(label)) return "birthDay";
  if (/^الشهر$/.test(label)) return "birthMonth";
  if (/^السنة$/.test(label)) return "birthYear";
  return null;
}

function matchMetricField(label: string): ColumnDescriptorBase["type"] | null {
  for (const matcher of METRIC_MATCHERS) {
    if (matcher.regex.test(label)) {
      return matcher.key;
    }
  }
  return null;
}

function isTermLabel(label: string): label is typeof TERM_LABELS[number] {
  return TERM_LABELS.includes(label as typeof TERM_LABELS[number]);
}

function assignSubjectDescriptor(
  index: number,
  subjectName: string,
  termLabel: string,
  descriptors: ColumnDescriptor[],
  subjectsMeta: Map<string, Partial<Record<TermKey, number>>>,
): boolean {
  if (!isTermLabel(termLabel)) return false;
  const termKey = TERM_MAP[termLabel];
  if (!termKey) return false;

  descriptors[index] = {
    type: "subject",
    subject: subjectName,
    term: termKey,
  };

  if (!subjectsMeta.has(subjectName)) {
    subjectsMeta.set(subjectName, {});
  }
  subjectsMeta.get(subjectName)![termKey] = index;
  return true;
}

function buildColumnDescriptors(rows: any[][], headerRowIndex: number) {
  const headerRow = rows[headerRowIndex] ?? [];
  const subHeaderRow = rows[headerRowIndex + 1] ?? [];
  const maxColumns = Math.max(headerRow.length, subHeaderRow.length);

  const descriptors: ColumnDescriptor[] = Array.from({ length: maxColumns }, () => null);
  const subjectsMeta: SubjectTermMeta = new Map();
  const subjectOrder: string[] = [];

  let currentSubject: string | null = null;

  for (let col = 0; col < maxColumns; col++) {
    const headerLabel = normalizeCell(headerRow[col]);
    const subHeaderLabel = normalizeCell(subHeaderRow[col]);

    let assigned = false;

    if (headerLabel) {
      const staticField = matchStaticField(headerLabel);
      if (staticField) {
        descriptors[col] = { type: staticField } as ColumnDescriptorBase;
        currentSubject = null;
        assigned = true;
      }
    }

    if (!assigned && headerLabel) {
      const metricField = matchMetricField(headerLabel);
      if (metricField) {
        descriptors[col] = { type: metricField } as ColumnDescriptorBase;
        currentSubject = null;
        assigned = true;
      }
    }

    if (!assigned && headerLabel && isTermLabel(headerLabel) && currentSubject) {
      assigned = assignSubjectDescriptor(col, currentSubject, headerLabel, descriptors, subjectsMeta);
    }

    if (!assigned && headerLabel) {
      const isNote = /تعبأ/.test(headerLabel);
      const isBirthdateGroup = /تاريخ\s*الولادة/.test(headerLabel);
      if (!isNote && !isBirthdateGroup) {
        currentSubject = headerLabel;
        if (!subjectsMeta.has(currentSubject)) {
          subjectsMeta.set(currentSubject, {});
          subjectOrder.push(currentSubject);
        }
      } else {
        currentSubject = null;
      }
    }

    if (!assigned && currentSubject && subHeaderLabel && isTermLabel(subHeaderLabel)) {
      assigned = assignSubjectDescriptor(col, currentSubject, subHeaderLabel, descriptors, subjectsMeta);
    }

    if (!assigned && subHeaderLabel) {
      const staticField = matchStaticField(subHeaderLabel);
      if (staticField) {
        descriptors[col] = { type: staticField } as ColumnDescriptorBase;
        currentSubject = null;
        assigned = true;
      }
    }

    if (!assigned && subHeaderLabel) {
      const metricField = matchMetricField(subHeaderLabel);
      if (metricField) {
        descriptors[col] = { type: metricField } as ColumnDescriptorBase;
        currentSubject = null;
        assigned = true;
      }
    }

    if (!assigned && currentSubject && subHeaderLabel && !isTermLabel(subHeaderLabel)) {
      currentSubject = null;
    }
  }

  const subjects: GradebookSubject[] = subjectOrder.map((name) => ({ name }));

  return { descriptors, subjects, subjectsMeta };
}

function findRowByLabel(rows: any[][], endIndex: number, regex: RegExp): { index: number; row: any[] } | null {
  const limit = Math.min(Math.max(endIndex, 0), rows.length);
  for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;
    for (let col = 0; col < row.length; col++) {
      const cell = normalizeCell(row[col]);
      if (!cell) continue;
      if (regex.test(cell)) {
        return { index: rowIndex, row };
      }
    }
  }
  return null;
}

function parseNumericText(value: unknown): string | undefined {
  const text = normalizeCell(value);
  if (!text) return undefined;
  const cleaned = text.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  if (!cleaned) return undefined;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return undefined;
  if (Number.isInteger(numeric)) {
    return String(Math.trunc(numeric));
  }
  return numeric.toString();
}

function findFirstNumericRowAfterHeader(
  rows: any[][],
  headerRowIndex: number,
  descriptors: ColumnDescriptor[],
  subjectColumnIndices: number[],
  startRowIndex?: number,
): { index: number; row: any[] } | null {
  if (subjectColumnIndices.length === 0) return null;

  const serialIndex = descriptors.findIndex((descriptor) => descriptor && descriptor.type === "serial");
  const nameIndex = descriptors.findIndex((descriptor) => descriptor && descriptor.type === "name");
  const beginIndex = startRowIndex != null ? startRowIndex : headerRowIndex + 2;

  for (let rowIndex = beginIndex; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    const serialValue = serialIndex !== -1 ? normalizeCell(row[serialIndex]) : "";
    const nameValue = nameIndex !== -1 ? normalizeCell(row[nameIndex]) : "";
    if (serialValue || nameValue) {
      break;
    }

    let numericCount = 0;
    for (const columnIndex of subjectColumnIndices) {
      if (columnIndex == null || columnIndex >= row.length) continue;
      if (parseNumericText(row[columnIndex]) != null) {
        numericCount += 1;
      }
    }

    if (numericCount >= Math.max(1, Math.ceil(subjectColumnIndices.length * 0.5))) {
      return { index: rowIndex, row };
    }
  }

  return null;
}

function extractSubjectScoreLimits(
  rows: any[][],
  headerRowIndex: number,
  descriptors: ColumnDescriptor[],
  subjectsMeta: SubjectTermMeta,
): Map<string, { max?: string; min?: string }> {
  const result = new Map<string, { max?: string; min?: string }>();

  const firstTermIndices = new Map<string, number>();
  subjectsMeta.forEach((meta, subjectName) => {
    if (!meta) return;
    const index = meta.first ?? meta.average ?? meta.second;
    if (typeof index === "number") {
      firstTermIndices.set(subjectName, index);
    }
  });

  const uniqueSubjectColumns = Array.from(new Set(firstTermIndices.values())).sort((a, b) => a - b);

  let maxInfo = findRowByLabel(rows, headerRowIndex, /النهاية\s*العظمى/i);
  if (!maxInfo) {
    maxInfo = findFirstNumericRowAfterHeader(rows, headerRowIndex, descriptors, uniqueSubjectColumns);
  }

  let minInfo = findRowByLabel(rows, headerRowIndex, /النهاية\s*(الصغرى|الدنيا)/i);
  if (!minInfo && maxInfo && maxInfo.index >= 0) {
    minInfo = findFirstNumericRowAfterHeader(
      rows,
      headerRowIndex,
      descriptors,
      uniqueSubjectColumns,
      maxInfo.index + 1,
    );
  }

  firstTermIndices.forEach((columnIndex, subjectName) => {
    const entry = result.get(subjectName) ?? {};

    if (maxInfo && columnIndex < maxInfo.row.length) {
      const numericText = parseNumericText(maxInfo.row[columnIndex]);
      if (numericText != null) {
        entry.max = numericText;
      }
    }

    if (minInfo && columnIndex < minInfo.row.length) {
      const numericText = parseNumericText(minInfo.row[columnIndex]);
      if (numericText != null) {
        entry.min = numericText;
      }
    }

    if (entry.max !== undefined || entry.min !== undefined) {
      result.set(subjectName, entry);
    }
  });

  return result;
}

function extractStudents(
  rows: any[][],
  headerRowIndex: number,
  descriptors: ColumnDescriptor[],
  subjects: GradebookSubject[],
): GradebookStudent[] {
  const students: GradebookStudent[] = [];
  const startRow = headerRowIndex + 2; // skip header and term rows

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    const serialDescriptorIndex = descriptors.findIndex((d) => d && d.type === "serial");
    const nameDescriptorIndex = descriptors.findIndex((d) => d && d.type === "name");

    const serialValue = serialDescriptorIndex !== -1 ? normalizeCell(row[serialDescriptorIndex]) : "";
    const nameValue = nameDescriptorIndex !== -1 ? normalizeCell(row[nameDescriptorIndex]) : "";

    if (!serialValue && !nameValue) {
      continue;
    }

    const student: GradebookStudent = {
      serial: serialValue || String(students.length + 1),
      name: nameValue,
      nationality: undefined,
      birthPlace: undefined,
      birthDay: undefined,
      birthMonth: undefined,
      birthYear: undefined,
      respect: undefined,
      absenceDays: undefined,
      repeatedGrades: undefined,
      completionResult: undefined,
      total: undefined,
      percentage: undefined,
      annualResult: undefined,
      subjects: {},
    };

    for (let col = 0; col < descriptors.length; col++) {
      const descriptor = descriptors[col];
      if (!descriptor) continue;
      const cellValue = normalizeCell(row[col]);
      if (!cellValue) continue;

      if (descriptor.type === "subject") {
        if (!student.subjects[descriptor.subject]) {
          student.subjects[descriptor.subject] = {};
        }
        student.subjects[descriptor.subject][descriptor.term] = cellValue;
      } else {
        switch (descriptor.type) {
          case "nationality":
            student.nationality = cellValue;
            break;
          case "birthPlace":
            student.birthPlace = cellValue;
            break;
          case "birthDay":
            student.birthDay = cellValue;
            break;
          case "birthMonth":
            student.birthMonth = cellValue;
            break;
          case "birthYear":
            student.birthYear = cellValue;
            break;
          case "respect":
            student.respect = cellValue;
            break;
          case "absenceDays":
            student.absenceDays = cellValue;
            break;
          case "repeatedGrades":
            student.repeatedGrades = cellValue;
            break;
          case "completionResult":
            student.completionResult = cellValue;
            break;
          case "total":
            student.total = cellValue;
            break;
          case "percentage":
            student.percentage = cellValue;
            break;
          case "annualResult":
            student.annualResult = cellValue;
            break;
          default:
            break;
        }
      }
    }

    students.push(student);
  }

  const filteredStudents = students.filter((student) => student.name);
  return filteredStudents;
}

const sanitizeValue = (value?: string | number | null) => {
  if (value == null) return undefined;
  const text = String(value).trim();
  if (!text || text === "—") return undefined;
  return text;
};

const parseNumber = (value?: string | number | null): number | null => {
  if (value == null) return null;
  const text = String(value)
    .replace(/[^0-9.,-]/g, "")
    .replace(/,/g, ".")
    .trim();
  if (!text) return null;
  const digitNormalized = text
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776));
  if (!digitNormalized) return null;
  const numeric = Number.parseFloat(digitNormalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value: number, fractionDigits = 2): string => {
  const fixed = value.toFixed(fractionDigits);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};

export async function analyzeGradebookFile(file: File): Promise<GradebookAnalysis> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error("تعذر قراءة الملف"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        if (!workbook.SheetNames.length) {
          reject(new Error("الملف لا يحتوي على أي أوراق عمل"));
          return;
        }

        const primarySheetName = workbook.SheetNames.find((name) => name.includes("جدول العلامات")) ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primarySheetName];
        if (!worksheet) {
          reject(new Error("تعذر العثور على ورقة جدول العلامات"));
          return;
        }

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        if (!rows.length) {
          reject(new Error("الورقة المختارة فارغة"));
          return;
        }

        const info = extractInfo(rows);
        const headerRowIndex = detectHeaderRow(rows);
        const { descriptors, subjects, subjectsMeta } = buildColumnDescriptors(rows, headerRowIndex);
        const subjectLimits = extractSubjectScoreLimits(rows, headerRowIndex, descriptors, subjectsMeta);
        const students = extractStudents(rows, headerRowIndex, descriptors, subjects);

        subjects.forEach((subject) => {
          const limits = subjectLimits.get(subject.name);
          if (!limits) return;
          if (limits.max) subject.maxScore = limits.max;
          if (limits.min) subject.minScore = limits.min;
        });

        const termOrder: TermKey[] = ["first", "second", "average"];
        const detectedTerms = termOrder.filter((term) =>
          students.some((student) =>
            Object.values(student.subjects ?? {}).some((record) => {
              const value = record?.[term];
              if (typeof value === "string") {
                return value.trim().length > 0;
              }
              return value != null;
            }),
          ),
        );

        const terms: TermKey[] = detectedTerms.length > 0 ? detectedTerms : ["first"];

        resolve({
          info,
          subjects,
          terms,
          students,
        });
      } catch (error: any) {
        console.error("Error analyzing gradebook:", error);
        reject(new Error("حدث خطأ أثناء تحليل الملف. تأكد من صحة تنسيق جدول العلامات"));
      }
    };

    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsBinaryString(file);
  });
}

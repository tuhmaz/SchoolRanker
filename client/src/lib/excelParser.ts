import * as XLSX from 'xlsx';

export interface Student {
  id: string;
  name: string;
  firstName?: string;
  fatherName?: string;
  grandName?: string;
  familyName?: string;
  class: string;
  division: string;
  nationalId?: string;
  birthDate?: string;
  status?: string;
}

function findValueNearLabel(row: any[], labelIdx: number): string {
  for (let j = labelIdx - 1; j >= 0; j--) {
    const candidate = String(row[j] ?? '').trim();
    if (candidate && candidate !== ':') {
      return candidate;
    }
  }
  for (let j = labelIdx + 1; j < row.length; j++) {
    const candidate = String(row[j] ?? '').trim();
    if (candidate && candidate !== ':') {
      return candidate;
    }
  }
  return '';
}

function fallbackValueFromRows(
  rows: any[][],
  labelRegex: RegExp,
  candidateRowIndices: number[],
): string {
  for (const rowIndex of candidateRowIndices) {
    const row = rows[rowIndex];
    if (!row) continue;
    const labelIdx = row.findIndex((cell: any) => cell && labelRegex.test(String(cell)));
    if (labelIdx !== -1) {
      const value = findValueNearLabel(row, labelIdx);
      const normalized = normalizeFieldValue(value);
      if (normalized) return normalized;
    }
  }
  return '';
}

function normalizeFieldValue(value: unknown): string {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed === ':' || /^[:\-]+$/.test(trimmed)) return '';
  return trimmed;
}

export interface ParsedData {
  students: Student[];
  classes: {
    className: string;
    divisions: {
      id: string;
      division: string;
      subjects: { id: string; name: string }[];
    }[];
  }[];
  schoolInfo?: {
    directorate?: string;
    school?: string;
    program?: string;
  };
  sheets?: {
    sheetName: string;
    className: string;
    division: string;
    subject?: string;
    students: Student[];
  }[];
  warnings?: string[];
}

/**
 * تقسيم الاسم الكامل إلى أجزاء
 * مثال: "ادم محي الدين علي موسى" => 
 * { first: "ادم", father: "محي", grand: "الدين", family: "علي موسى" }
 */
function parseFullName(fullName: string) {
  if (!fullName || typeof fullName !== 'string') {
    return { first: '', father: '', grand: '', family: '' };
  }
  
  const parts = fullName.trim().split(/\s+/);
  
  return {
    first: parts[0] || '',
    father: parts[1] || '',
    grand: parts[2] || '',
    family: parts.slice(3).join(' ') || ''
  };
}

function readCell(rows: any[][], rowIndex: number, candidates: number[]): string {
  const row = rows[rowIndex];
  if (!row) {
    return '';
  }

  for (const index of candidates) {
    if (index < 0 || index >= row.length) continue;
    const value = row[index];
    const normalized = normalizeFieldValue(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

type ScanOptions = {
  maxRows?: number;
  invalidValuePattern?: RegExp;
};

type ValueSource = 'direct' | 'row-label' | 'sheet-name' | 'previous' | 'default';

function scanForLabelValue(
  rows: any[][],
  labelRegexes: RegExp[],
  optionsOrMaxRows?: number | ScanOptions,
): string {
  const options: ScanOptions =
    typeof optionsOrMaxRows === 'number'
      ? { maxRows: optionsOrMaxRows }
      : optionsOrMaxRows ?? {};

  const maxRows = options.maxRows ?? 30;
  const invalidValuePattern = options.invalidValuePattern;

  const headerStopRegex = /(اسم\s*الطالب|كشف\s+الطلبة)/;

  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const row = rows[i];
    if (row.some((cell: any) => headerStopRegex.test(String(cell ?? '').trim()))) {
      break;
    }

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      const value = cell != null ? String(cell).trim() : '';
      if (!value) continue;
      if (!labelRegexes.some((regex) => regex.test(value))) continue;

      for (let left = j - 1; left >= 0; left--) {
        const candidate = String(row[left] ?? '').trim();
        if (!candidate || candidate === ':') continue;
        if (invalidValuePattern && invalidValuePattern.test(candidate)) continue;
        return candidate;
      }

      for (let right = j + 1; right < row.length; right++) {
        const candidate = String(row[right] ?? '').trim();
        if (!candidate || candidate === ':') continue;
        if (invalidValuePattern && invalidValuePattern.test(candidate)) continue;
        return candidate;
      }
    }
  }
  return '';
}

export async function parseMinistryFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('تعذر قراءة الملف'));
          return;
        }

        const workbook = XLSX.read(data as string, { type: 'binary' });
        if (!workbook.SheetNames.length) {
          reject(new Error('الملف لا يحتوي على أي أوراق عمل'));
          return;
        }

        const allStudents: Student[] = [];
        const sheetResults: NonNullable<ParsedData["sheets"]> = [];
        const warnings: string[] = [];
        const classMap = new Map<string, Map<string, Set<string>>>();
        const sheetsMissingClass = new Set<string>();
        const sheetsMissingDivision = new Set<string>();

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];

        let schoolInfo: { directorate: string; school: string; program: string } | null = null;

        const directorate =
          readCell(firstSheetData, 8, [23, 22, 21, 20, 19, 18]) ||
          scanForLabelValue(firstSheetData, [/(مديرية)/], 40);
        if (directorate) {
          schoolInfo ??= { directorate: '', school: '', program: '' };
          schoolInfo.directorate = directorate;
        }

        const schoolName =
          readCell(firstSheetData, 12, [23, 22, 21, 20, 19, 18]) ||
          scanForLabelValue(firstSheetData, [/(المدرسة|مدرسة)/], 40);
        if (schoolName) {
          schoolInfo ??= { directorate: '', school: '', program: '' };
          schoolInfo.school = schoolName;
        }

        const program =
          readCell(firstSheetData, 10, [3, 2, 1, 0, 4, 5]) ||
          scanForLabelValue(firstSheetData, [/(المرحلة|المسار|البرنامج)/], 40);
        if (program) {
          schoolInfo ??= { directorate: '', school: '', program: '' };
          schoolInfo.program = program;
        }

        const sourceLabels: Record<ValueSource, string> = {
          direct: 'الخلايا الرئيسية في النموذج',
          'row-label': 'النص المجاور لعناوين الحقول',
          'sheet-name': 'اسم ورقة العمل',
          previous: 'آخر ورقة تم العثور فيها على صف صالح',
          default: 'القيمة الافتراضية',
        };

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

          let classNameSource: ValueSource = 'direct';
          let divisionSource: ValueSource = 'direct';

          // قراءة بيانات الصف والشعبة والمادة الدراسية من الملف الرئيسي
        // أولاً نحاول قراءة البيانات من الملف الرئيسي (EL_StudentInfoReport.xls)
        let className = readCell(rows, 6, [3, 2, 1, 0, 4]) || readCell(rows, 5, [3, 2, 1, 0, 4]);
        if (!className) {
          const fromRows = fallbackValueFromRows(rows, /الصف/, [5, 6, 4, 7]);
          if (fromRows) {
            className = fromRows;
            classNameSource = 'row-label';
          }
        }
        if (!className) {
          const scanned = scanForLabelValue(rows, [/الصف/], {
            maxRows: 25,
            invalidValuePattern: /(اسم|رقم|تاريخ|حالة|عنوان|هاتف|الجنسية|مكان|كشف)/,
          });
          if (scanned) {
            className = scanned;
            classNameSource = 'row-label';
          }
        }
        // محاولة قراءة الصف من الملف الرئيسي
        if (!className && firstSheetData) {
          const classFromMainFile = scanForLabelValue(firstSheetData, [/الصف/], {
            maxRows: 25,
            invalidValuePattern: /(اسم|رقم|تاريخ|حالة|عنوان|هاتف|الجنسية|مكان|كشف)/,
          });
          if (classFromMainFile) {
            className = classFromMainFile;
            classNameSource = 'direct';
          }
        }

        let division = readCell(rows, 14, [3, 2, 1, 0, 4]) || readCell(rows, 13, [3, 2, 1, 0, 4]);
        if (!division) {
          const fromRows = fallbackValueFromRows(rows, /الشعبة/, [13, 14, 12, 15]);
          if (fromRows) {
            division = fromRows;
            divisionSource = 'row-label';
          }
        }
        if (!division) {
          const scanned = scanForLabelValue(rows, [/الشعبة/], {
            maxRows: 30,
            invalidValuePattern: /(اسم|رقم|تاريخ|حالة|عنوان|هاتف|الجنسية|مكان)/,
          });
          if (scanned) {
            division = scanned;
            divisionSource = 'row-label';
          }
        }
        if (!division) {
          const inlineDivision = rows
            .filter((row) => row.some((cell: any) => typeof cell === 'string' && /الشعبة/.test(String(cell))))
            .flatMap((row) =>
              row
                .map((cell: any) => (cell != null ? String(cell).trim() : ''))
                .filter((value) => value && value !== ':' && !/الشعبة/.test(value)),
            )
            .find((value) => value.length <= 5);
          if (inlineDivision) {
            division = inlineDivision;
            divisionSource = 'row-label';
          }
        }
        // محاولة قراءة الشعبة من الملف الرئيسي
        if (!division && firstSheetData) {
          const divisionFromMainFile = scanForLabelValue(firstSheetData, [/الشعبة/], {
            maxRows: 30,
            invalidValuePattern: /(اسم|رقم|تاريخ|حالة|عنوان|هاتف|الجنسية|مكان)/,
          });
          if (divisionFromMainFile) {
            division = divisionFromMainFile;
            divisionSource = 'direct';
          }
        }

        let subject = scanForLabelValue(rows, [/(المبحث|المادة\s*الدراسية|المادة)/], 25);
        // محاولة قراءة المادة الدراسية من الملف الرئيسي
        if (!subject && firstSheetData) {
          const subjectFromMainFile = scanForLabelValue(firstSheetData, [/(المبحث|المادة\s*الدراسية|المادة)/], 25);
          if (subjectFromMainFile) {
            subject = subjectFromMainFile;
          }
        }

          if (!className) {
            const parts = sheetName.split(' - ');
            if (parts.length >= 2) {
              className = parts[0].trim();
              division = division || parts[1].trim();
              subject = subject || parts.slice(2).join(' - ').trim();
              classNameSource = 'sheet-name';
              if (!division) {
                divisionSource = 'sheet-name';
              }
            }
          }

          const normalizedClass = className?.trim();
          const normalizedDivision = division?.trim();

          const hadClass = !!normalizedClass;
          const hadDivision = !!normalizedDivision;

          className = hadClass ? normalizedClass! : `غير محدد (${sheetName})`;
          division = hadDivision ? normalizedDivision! : `بدون شعبة (${sheetName})`;
          subject = subject?.trim() || '';

          if (!hadClass) {
            sheetsMissingClass.add(sheetName);
            classNameSource = classNameSource || 'default';
          }
          if (!hadDivision) {
            sheetsMissingDivision.add(sheetName);
            divisionSource = divisionSource || 'default';
          }

          if (!hadClass || !hadDivision) {
            warnings.push(
              `لم يتم العثور على ${(hadClass ? '' : 'اسم الصف')} ${(hadDivision ? '' : (hadClass ? 'الشعبة' : 'والشعبة'))} في الورقة "${sheetName}". تم استخدام القيم الافتراضية.`.replace(/\s+/g, ' ').trim()
            );
          } else {
            const warnableSources: ValueSource[] = ['sheet-name', 'previous', 'row-label'];
            if (warnableSources.includes(classNameSource)) {
              warnings.push(
                `تم استخراج اسم الصف "${className}" في الورقة "${sheetName}" من ${sourceLabels[classNameSource]}. يرجى التحقق من الخلية المخصصة للصف.`
              );
            }
            if (warnableSources.includes(divisionSource)) {
              warnings.push(
                `تم استخراج الشعبة "${division}" في الورقة "${sheetName}" من ${sourceLabels[divisionSource]}. يرجى التحقق من الخلية المخصصة للشعبة.`
              );
            }
          }

          if (!classMap.has(className)) {
            classMap.set(className, new Map());
          }
          const divisionMap = classMap.get(className)!;
          if (!divisionMap.has(division)) {
            divisionMap.set(division, new Set());
          }
          if (subject) {
            divisionMap.get(division)!.add(subject);
          }

          let headerRowIndex = -1;
          let nameColumnIndex = -1;
          let divisionColumnIndex = -1;
          let nationalIdColumnIndex = -1;
          let birthDateColumnIndex = -1;
          let statusColumnIndex = -1;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const nameIdx = row.findIndex((cell: any) => {
              if (!cell) return false;
              const text = String(cell);
              return /اسم\s*الطالب/.test(text) || text.includes('الاسم');
            });
            if (nameIdx !== -1) {
              headerRowIndex = i;
              nameColumnIndex = nameIdx;
              divisionColumnIndex = row.findIndex((cell: any) => cell && String(cell).trim() === 'الشعبة');
              nationalIdColumnIndex = row.findIndex((cell: any) => cell && /(رقم\s*(الإثبات|الهوية))/.test(String(cell)));
              birthDateColumnIndex = row.findIndex((cell: any) => cell && /تاريخ\s*الميلاد/.test(String(cell)));
              statusColumnIndex = row.findIndex((cell: any) => cell && /حالة\s*القيد/.test(String(cell)));
              break;
            }
          }

          if (headerRowIndex === -1 || nameColumnIndex === -1) {
            if (className && division) {
              sheetResults.push({
                sheetName,
                className,
                division,
                subject: subject || undefined,
                students: [],
              });
            }
            continue;
          }

          const sheetStudents: Student[] = [];
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const studentName = String(row[nameColumnIndex] ?? '').trim();
            if (!studentName) continue;

            let studentDivision = division;
            if (divisionColumnIndex !== -1) {
              const divValue = String(row[divisionColumnIndex] ?? '').trim();
              if (divValue) {
                studentDivision = divValue;
              }
            }
            studentDivision = studentDivision?.trim() || 'بدون شعبة';

            const nationalId = nationalIdColumnIndex !== -1 ? String(row[nationalIdColumnIndex] ?? '').trim() : '';
            const studentId = nationalId || `student-${sheetName}-${i - headerRowIndex}`;

            let existingStudent = allStudents.find(
              (s) => s.id === studentId || (s.name === studentName && s.class === className)
            );

            if (!existingStudent) {
              const birthDate = birthDateColumnIndex !== -1 ? String(row[birthDateColumnIndex] ?? '').trim() : '';
              const status = statusColumnIndex !== -1 ? String(row[statusColumnIndex] ?? '').trim() : '';
              const parsedName = parseFullName(studentName);

              existingStudent = {
                id: studentId,
                name: studentName,
                firstName: parsedName.first,
                fatherName: parsedName.father,
                grandName: parsedName.grand,
                familyName: parsedName.family,
                class: className,
                division: studentDivision,
                nationalId,
                birthDate,
                status,
              };
              allStudents.push(existingStudent);
            } else if (studentDivision && !existingStudent.division) {
              existingStudent.division = studentDivision;
            }

            const existingDivisionMap = classMap.get(className);
            if (existingDivisionMap) {
              if (!existingDivisionMap.has(studentDivision)) {
                existingDivisionMap.set(studentDivision, new Set());
              }
              if (subject) {
                existingDivisionMap.get(studentDivision)!.add(subject);
              }
            }

            sheetStudents.push({ ...existingStudent });
          }

          if (sheetStudents.length > 0 || (className && division)) {
            sheetResults.push({
              sheetName,
              className,
              division,
              subject: subject || undefined,
              students: sheetStudents,
            });
          }
        }

        if (sheetsMissingClass.size > 0) {
          warnings.push(
            `هناك ${sheetsMissingClass.size} ورقة لا تحتوي على خانة الصف بشكل صريح: ${Array.from(sheetsMissingClass).join(", ")}. تم استخدام القيمة الافتراضية "غير محدد".`,
          );
        }

        if (sheetsMissingDivision.size > 0) {
          warnings.push(
            `هناك ${sheetsMissingDivision.size} ورقة لا تحتوي على خانة الشعبة بشكل صريح: ${Array.from(sheetsMissingDivision).join(", ")}. تم استخدام القيمة الافتراضية "بدون شعبة".`,
          );
        }

        if (allStudents.length === 0) {
          reject(new Error('تعذر العثور على بيانات الطلبة في الملف'));
          return;
        }

        const classes = Array.from(classMap.entries()).map(([className, divisionMap]) => ({
          className,
          divisions: Array.from(divisionMap.entries()).map(([division, subjects]) => ({
            id: `${className}-${division}`,
            division,
            subjects: Array.from(subjects).map((subject) => ({
              id: `${className}-${division}-${subject}`,
              name: subject,
            })),
          })),
        }));

        resolve({
          students: allStudents,
          classes,
          schoolInfo: schoolInfo ?? undefined,
          sheets: sheetResults,
          warnings: warnings.length > 0 ? Array.from(new Set(warnings)) : undefined,
        });
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        reject(new Error('خطأ في قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة'));
      }
    };

    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsBinaryString(file);
  });
}

// Legacy alias
export const parseExcelFile = parseMinistryFile;

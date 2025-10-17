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
  sheets?: {
    sheetName: string;
    className: string;
    division: string;
    subject?: string;
    students: Student[];
  }[];
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

export async function parseMinistryFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as string | ArrayBuffer | null;
        const workbook = XLSX.read(data as string, { type: 'binary' });

        const allStudents: Student[] = [];
        const sheetResults: NonNullable<ParsedData["sheets"]> = [];
        const classMap = new Map<string, Map<string, Set<string>>>(); // class -> division -> subjects

        let fallbackClassName = '';
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

          // Prefer fixed positions used in ministry exports
          let className = rows[6]?.[3] ? String(rows[6][3]).trim() : '';
          let division = rows[14]?.[3] ? String(rows[14][3]).trim() : '';
          // Fallbacks: scan for labels when fixed cells are empty
          if (!className) {
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
              const row = rows[i];
              const labelIdx = row.findIndex((cell: any) => cell && /الصف/.test(String(cell)));
              if (labelIdx !== -1) {
                for (let j = labelIdx - 1; j >= 0; j--) {
                  const val = String(row[j] ?? '').trim();
                  if (val && val !== ':') { className = val; break; }
                }
                if (!className) {
                  for (let j = labelIdx + 1; j < row.length; j++) {
                    const val = String(row[j] ?? '').trim();
                    if (val && val !== ':') { className = val; break; }
                  }
                }
                if (className) break;
              }
            }
          }
          if (!division) {
            for (let i = 0; i < Math.min(rows.length, 30); i++) {
              const row = rows[i];
              const labelIdx = row.findIndex((cell: any) => cell && /الشعبة/.test(String(cell)));
              if (labelIdx !== -1) {
                for (let j = labelIdx - 1; j >= 0; j--) {
                  const val = String(row[j] ?? '').trim();
                  if (val && val !== ':') { division = val; break; }
                }
                if (!division) {
                  for (let j = labelIdx + 1; j < row.length; j++) {
                    const val = String(row[j] ?? '').trim();
                    if (val && val !== ':') { division = val; break; }
                  }
                }
                if (division) break;
              }
            }
          }
          let subject = '';

          // Attempt to detect subject by scanning first 20 rows for a label like "المبحث" أو "المادة الدراسية"
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            const idx = row.findIndex((cell: any) => cell && /(المبحث|المادة\s*الدراسية|المادة)/.test(String(cell)));
            if (idx !== -1) {
              for (let j = idx + 1; j < row.length; j++) {
                const val = String(row[j] ?? '').trim();
                if (val && val !== ':') { subject = val; break; }
              }
              if (!subject) { // fallback: check left side too
                for (let j = idx - 1; j >= 0; j--) {
                  const val = String(row[j] ?? '').trim();
                  if (val && val !== ':') { subject = val; break; }
                }
              }
              if (subject) break;
            }
          }

          // Fallback: parse from sheet name pattern: "Class - Division - Subject"
          if (!className) {
            const parts = sheetName.split(' - ');
            if (parts.length >= 2) {
              className = parts[0].trim();
              division = parts[1].trim();
              subject = parts.slice(2).join(' - ').trim();
            }
          }

          // Global fallback: if class is still empty, reuse last detected class from previous sheet
          if (!className && fallbackClassName) {
            className = fallbackClassName;
          }
          // Remember first non-empty className to use for subsequent sheets if missing there
          if (className && !fallbackClassName) {
            fallbackClassName = className;
          }

          // Ensure we record the class/division even if we can't parse students later
          if (className && division) {
            if (!classMap.has(className)) classMap.set(className, new Map());
            const divisionMap = classMap.get(className)!;
            if (!divisionMap.has(division)) divisionMap.set(division, new Set());
            if (subject) divisionMap.get(division)!.add(subject);
          }

          // Locate header row: look for "اسم الطالب"
          let headerRowIndex = -1;
          let nameColumnIndex = -1;
          let divisionColumnIndex = -1;
          let nationalIdColumnIndex = -1;
          let birthDateColumnIndex = -1;
          let statusColumnIndex = -1;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const nameIdx = row.findIndex((cell: any) => cell && /اسم\s*الطالب/.test(String(cell)));
            if (nameIdx !== -1) {
              headerRowIndex = i;
              nameColumnIndex = nameIdx;
              divisionColumnIndex = row.findIndex((cell: any) => cell && String(cell).trim() === 'الشعبة');
              // Some files may use different labels; try common variants
              nationalIdColumnIndex = row.findIndex((cell: any) => cell && /(رقم\s*(الإثبات|الهوية))/.test(String(cell)));
              birthDateColumnIndex = row.findIndex((cell: any) => cell && /تاريخ\s*الميلاد/.test(String(cell)));
              statusColumnIndex = row.findIndex((cell: any) => cell && /حالة\s*القيد/.test(String(cell)));
              break;
            }
          }

          if (headerRowIndex === -1 || nameColumnIndex === -1) {
            // record sheet summary with zero students if we at least have class/division
            if (className && division) {
              sheetResults.push({
                sheetName,
                className,
                division,
                subject: subject || undefined,
                students: [],
              });
            }
            continue; // no students on this sheet
          }

          const sheetStudents: Student[] = [];
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const studentName = String(row[nameColumnIndex] ?? '').trim();
            if (!studentName) continue;

            let studentDivision = division;
            if (divisionColumnIndex !== -1) {
              const divValue = String(row[divisionColumnIndex] ?? '').trim();
              if (divValue) studentDivision = divValue;
            }

            const nationalId = nationalIdColumnIndex !== -1 ? String(row[nationalIdColumnIndex] ?? '').trim() : '';
            const studentId = nationalId || `student-${sheetName}-${i - headerRowIndex}`;

            let existingStudent = allStudents.find(
              s => s.id === studentId || (s.name === studentName && s.class === className)
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

            if (className && studentDivision) {
              if (!classMap.has(className)) classMap.set(className, new Map());
              const divisionMap = classMap.get(className)!;
              if (!divisionMap.has(studentDivision)) divisionMap.set(studentDivision, new Set());
              if (subject) divisionMap.get(studentDivision)!.add(subject);
            }
            // snapshot this student for the current sheet
            sheetStudents.push({ ...existingStudent });
          }
          // store per-sheet summary if found any students
          if (sheetStudents.length > 0) {
            sheetResults.push({
              sheetName,
              className,
              division,
              subject: subject || undefined,
              students: sheetStudents,
            });
          }
        }

        if (allStudents.length === 0) {
          reject(new Error('تعذر العثور على بيانات الطلاب في الملف.'));
          return;
        }

        // Group divisions under each class (الصف) as a single entry
        const classes = Array.from(classMap.entries()).map(([className, divisionMap]) => ({
          className,
          divisions: Array.from(divisionMap.entries()).map(([division, subjects]) => ({
            id: `${className}-${division}`,
            division,
            subjects: Array.from(subjects).map(subject => ({ id: `${className}-${division}-${subject}`, name: subject }))
          }))
        }));

        resolve({ students: allStudents, classes, sheets: sheetResults });
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        reject(new Error('حدث خطأ أثناء قراءة الملف. الرجاء التأكد من تنسيق ملف Excel.'));
      }
    };

    reader.onerror = () => reject(new Error('تعذر قراءة الملف.'));
    reader.readAsBinaryString(file);
  });
}

// Legacy alias
export const parseExcelFile = parseMinistryFile;

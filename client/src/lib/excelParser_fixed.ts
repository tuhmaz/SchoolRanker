import * as XLSX from 'xlsx';

export interface Student {
  id: string;
  name: string;
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
  schoolInfo?: {
    directorate: string;
    school: string;
    program: string;
  };
  sheets?: {
    sheetName: string;
    className: string;
    division: string;
    subject?: string;
    students: Student[];
  }[];
}

export async function parseMinistryFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const allStudents: Student[] = [];
        const classMap = new Map<string, Map<string, Set<string>>>(); // class -> division -> subjects
        const sheetResults: NonNullable<ParsedData["sheets"]> = [];
        let schoolInfo: { directorate: string; school: string; program: string } | undefined;

        // Extract school info from first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];

        // Directorate at row 8, index 23
        if (firstSheetData[8] && firstSheetData[8][23]) {
          schoolInfo ??= { directorate: "", school: "", program: "" };
          schoolInfo.directorate = String(firstSheetData[8][23]).trim();
        }

        // School at row 12, index 23
        if (firstSheetData[12] && firstSheetData[12][23]) {
          schoolInfo ??= { directorate: "", school: "", program: "" };
          schoolInfo.school = String(firstSheetData[12][23]).trim();
        }

        // Program at row 10, index 3
        if (firstSheetData[10] && firstSheetData[10][3]) {
          schoolInfo ??= { directorate: "", school: "", program: "" };
          schoolInfo.program = String(firstSheetData[10][3]).trim();
        }

        // Process each sheet
        let fallbackClassName = '';
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

          // Extract class, division, and subject from the first few rows
          let className = '';
          let division = '';
          let subject = '';

          // Extract class from fixed position row 6, column 3
          if (rows[6] && rows[6][3]) {
            className = String(rows[6][3]).trim();
          }
          // Fallback: scan for a label like "الصف" nearby and pick closest non-empty cell
          if (!className) {
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
              const row = rows[i];
              const labelIdx = row.findIndex((cell: any) => cell && /الصف/.test(String(cell)));
              if (labelIdx !== -1) {
                // try left neighbors first, then right
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

          // Extract division from fixed position row 14, column 3
          if (rows[14] && rows[14][3]) {
            division = String(rows[14][3]).trim();
          }
          // Fallback: scan for a label like "الشعبة" nearby and pick closest non-empty cell
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

          // Find subject label (المبحث / المادة الدراسية) and read adjacent value
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            const subjectIndex = row.findIndex((cell: any) =>
              cell && /(المبحث|المادة\s*الدراسية|المادة)/.test(String(cell))
            );
            if (subjectIndex !== -1) {
              for (let j = subjectIndex + 1; j < row.length; j++) {
                if (row[j] && String(row[j]).trim() !== '') {
                  subject = String(row[j]).trim();
                  break;
                }
              }
              // fallback: check a cell to the left too
              if (!subject) {
                for (let j = subjectIndex - 1; j >= 0; j--) {
                  const val = String(row[j] ?? '').trim();
                  if (val && val !== ':') { subject = val; break; }
                }
              }
            }
          }

          // If no class found, try to parse from sheet name (for competitor files)
          if (!className) {
            const parts = sheetName.split(' - ');
            if (parts.length >= 3) {
              className = parts[0].trim();
              division = parts[1].trim();
              subject = parts.slice(2).join(' - ').trim();
            }
          }

          // Global fallback: some files only include الصف في أول شيت
          if (!className && fallbackClassName) {
            className = fallbackClassName;
          }
          if (className && !fallbackClassName) {
            fallbackClassName = className;
          }

          // Always register this class/division even if later we can't parse students
          if (className && division) {
            if (!classMap.has(className)) classMap.set(className, new Map());
            const divisionMap = classMap.get(className)!;
            if (!divisionMap.has(division)) divisionMap.set(division, new Set());
            if (subject) divisionMap.get(division)!.add(subject);
          }

          // Find header row (contains student names)
          let headerRowIndex = -1;
          let nameColumnIndex = -1;
          let divisionColumnIndex = -1;
          let nationalIdColumnIndex = -1;
          let birthDateColumnIndex = -1;
          let statusColumnIndex = -1;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const nameIdx = row.findIndex((cell: any) =>
              cell && (String(cell).includes('اسم الطالب') || String(cell).includes('الاسم'))
            );

            if (nameIdx !== -1) {
              headerRowIndex = i;
              nameColumnIndex = nameIdx;

              // Find other columns
              divisionColumnIndex = row.findIndex((cell: any) => cell && String(cell).trim() === 'الشعبة');
              nationalIdColumnIndex = row.findIndex((cell: any) => cell && String(cell).includes('رقم الإثبات'));
              birthDateColumnIndex = row.findIndex((cell: any) => cell && String(cell).includes('تاريخ الميلاد'));
              statusColumnIndex = row.findIndex((cell: any) => cell && String(cell).includes('حالة القيد'));
              break;
            }
          }

          if (headerRowIndex === -1 || nameColumnIndex === -1) {
            // record sheet with zero students, but preserve class/division info
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

          // Extract students from this sheet
          const sheetStudents: Student[] = [];
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];

            const studentName = row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : '';
            if (!studentName) continue;

            // Get division from row if available, otherwise use extracted division
            let studentDivision = division;
            if (divisionColumnIndex !== -1 && row[divisionColumnIndex]) {
              const divValue = String(row[divisionColumnIndex]).trim();
              if (divValue) {
                studentDivision = divValue;
              }
            }

            const nationalId = nationalIdColumnIndex !== -1 ? String(row[nationalIdColumnIndex] || '').trim() : '';
            const studentId = nationalId || `student-${sheetName}-${i - headerRowIndex}`;

            // Check if student already exists
            let existingStudent = allStudents.find(s => s.id === studentId || (s.name === studentName && s.class === className));

            if (!existingStudent) {
              existingStudent = {
                id: studentId,
                name: studentName,
                class: className,
                division: studentDivision,
                nationalId: nationalId,
                birthDate: birthDateColumnIndex !== -1 ? String(row[birthDateColumnIndex] || '').trim() : '',
                status: statusColumnIndex !== -1 ? String(row[statusColumnIndex] || '').trim() : '',
              };
              allStudents.push(existingStudent);
            } else {
              // Update division if different
              if (studentDivision && !existingStudent.division) {
                existingStudent.division = studentDivision;
              }
            }

            // Track classes, divisions, and subjects
            if (className && studentDivision) {
              if (!classMap.has(className)) {
                classMap.set(className, new Map());
              }
              const divisionMap = classMap.get(className)!;
              if (!divisionMap.has(studentDivision)) {
                divisionMap.set(studentDivision, new Set());
              }
              if (subject) {
                divisionMap.get(studentDivision)!.add(subject);
              }
            }

            // snapshot to this sheet
            sheetStudents.push({ ...existingStudent });
          }
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
          reject(new Error('لم يتم العثور على أي طلبة في الملف'));
          return;
        }

        // Build classes structure: group all شعب داخل الصف الواحد
        const classes = Array.from(classMap.entries()).map(([className, divisionMap]) => ({
          className,
          divisions: Array.from(divisionMap.entries()).map(([division, subjects]) => ({
            id: `${className}-${division}`,
            division,
            subjects: Array.from(subjects).map(subject => ({
              id: `${className}-${division}-${subject}`,
              name: subject
            }))
          }))
        }));

        resolve({ students: allStudents, classes, schoolInfo, sheets: sheetResults });
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        reject(new Error('خطأ في قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'));
    };

    reader.readAsBinaryString(file);
  });
}

// Legacy function for backward compatibility
export const parseExcelFile = parseMinistryFile;

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
}

export async function parseMinistryFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse as array to preserve structure
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        // Extract class and division
        let className = '';
        let division = '';
        
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i];
          
          // Find class (الصف) - the value is usually before the label
          const classIndex = row.findIndex((cell: any) => 
            cell && String(cell).trim() === 'الصف'
          );
          if (classIndex !== -1) {
            // Look for the value before the colon
            for (let j = classIndex - 1; j >= 0; j--) {
              if (row[j] && String(row[j]).trim() !== '' && String(row[j]).trim() !== ':') {
                className = String(row[j]).trim();
                break;
              }
            }
          }
          
          // Find division (الشعبة) in the same way
          const divisionIndex = row.findIndex((cell: any) => 
            cell && String(cell).trim() === 'الشعبة'
          );
          if (divisionIndex !== -1 && divisionIndex < 15) { // Make sure it's in the header, not in the table
            for (let j = divisionIndex - 1; j >= 0; j--) {
              if (row[j] && String(row[j]).trim() !== '' && String(row[j]).trim() !== ':') {
                division = String(row[j]).trim();
                break;
              }
            }
          }
        }

        // Find header row (contains "اسم الطالب")
        let headerRowIndex = -1;
        let nameColumnIndex = -1;
        let divisionColumnIndex = -1;
        let nationalIdColumnIndex = -1;
        let birthDateColumnIndex = -1;
        let statusColumnIndex = -1;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          const nameIdx = row.findIndex((cell: any) => 
            cell && String(cell).includes('اسم الطالب')
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
          reject(new Error('لم يتم العثور على بيانات الطلبة في الملف. تأكد من أن الملف من منصة أجيال.'));
          return;
        }

        if (!className) {
          reject(new Error('لم يتم العثور على اسم الصف في الملف. تأكد من أن الملف من منصة أجيال.'));
          return;
        }

        // Extract students
        const students: Student[] = [];
        const classMap = new Map<string, Set<string>>();

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

          const student: Student = {
            id: `student-${i - headerRowIndex}`,
            name: studentName,
            class: className,
            division: studentDivision,
            nationalId: nationalIdColumnIndex !== -1 ? String(row[nationalIdColumnIndex] || '').trim() : '',
            birthDate: birthDateColumnIndex !== -1 ? String(row[birthDateColumnIndex] || '').trim() : '',
            status: statusColumnIndex !== -1 ? String(row[statusColumnIndex] || '').trim() : '',
          };

          students.push(student);

          // Track classes and divisions
          if (className && studentDivision) {
            if (!classMap.has(className)) {
              classMap.set(className, new Set());
            }
            classMap.get(className)!.add(studentDivision);
          }
        }

        if (students.length === 0) {
          reject(new Error('لم يتم العثور على أي طلبة في الملف'));
          return;
        }

        // Build classes structure
        const classes = Array.from(classMap.entries()).map(([className, divisionSet]) => ({
          className,
          divisions: Array.from(divisionSet).map(division => ({
            id: `${className}-${division}`,
            division,
            subjects: [] as { id: string; name: string }[]
          }))
        }));

        resolve({ students, classes });
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        reject(new Error('خطأ في قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة من منصة أجيال'));
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

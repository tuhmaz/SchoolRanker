import * as XLSX from 'xlsx';

export interface Student {
  id: string;
  name: string;
  class: string;
  division: string;
  gender?: string;
  birthDate?: string;
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

export async function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('الملف فارغ أو لا يحتوي على بيانات'));
          return;
        }

        // Extract students data
        const students: Student[] = jsonData.map((row, index) => {
          // Try different possible column names from Ajyal platform
          const name = row['اسم الطالب'] || row['الاسم'] || row['Student Name'] || row['Name'] || '';
          const className = row['الصف'] || row['Class'] || row['الصف الدراسي'] || '';
          const division = row['الشعبة'] || row['Division'] || row['الشعبة الدراسية'] || '';
          const gender = row['الجنس'] || row['Gender'] || '';
          const birthDate = row['تاريخ الميلاد'] || row['Birth Date'] || '';

          return {
            id: `student-${index + 1}`,
            name: String(name).trim(),
            class: String(className).trim(),
            division: String(division).trim(),
            gender: String(gender).trim(),
            birthDate: String(birthDate).trim(),
          };
        }).filter(s => s.name && s.class && s.division); // Filter out invalid rows

        // Group by class and division
        const classMap = new Map<string, Map<string, Student[]>>();

        students.forEach(student => {
          if (!classMap.has(student.class)) {
            classMap.set(student.class, new Map());
          }
          const divisionMap = classMap.get(student.class)!;
          if (!divisionMap.has(student.division)) {
            divisionMap.set(student.division, []);
          }
          divisionMap.get(student.division)!.push(student);
        });

        // Build classes structure
        const classes = Array.from(classMap.entries()).map(([className, divisionMap]) => ({
          className,
          divisions: Array.from(divisionMap.entries()).map(([division, _]) => ({
            id: `${className}-${division}`,
            division,
            subjects: [{ id: `subject-${className}-${division}-1`, name: '' }]
          }))
        }));

        resolve({ students, classes });
      } catch (error) {
        reject(new Error('خطأ في قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'));
    };

    reader.readAsBinaryString(file);
  });
}

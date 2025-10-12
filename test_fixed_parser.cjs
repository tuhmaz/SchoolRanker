const XLSX = require('xlsx');

const ministryFile = 'attached_assets/EL_StudentInfoReport_1760282285656.xls';
const workbook = XLSX.readFile(ministryFile);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

let className = '';
let division = '';

for (let i = 0; i < Math.min(rows.length, 20); i++) {
  const row = rows[i];
  
  const classIndex = row.findIndex(cell => cell && String(cell).trim() === 'الصف');
  if (classIndex !== -1) {
    for (let j = classIndex - 1; j >= 0; j--) {
      if (row[j] && String(row[j]).trim() !== '' && String(row[j]).trim() !== ':') {
        className = String(row[j]).trim();
        break;
      }
    }
  }
  
  const divisionIndex = row.findIndex(cell => cell && String(cell).trim() === 'الشعبة');
  if (divisionIndex !== -1 && divisionIndex < 15) {
    for (let j = divisionIndex - 1; j >= 0; j--) {
      if (row[j] && String(row[j]).trim() !== '' && String(row[j]).trim() !== ':') {
        division = String(row[j]).trim();
        break;
      }
    }
  }
}

console.log('=== Extraction Results ===');
console.log('Class:', className);
console.log('Division:', division);

// Find students
let headerRowIndex = -1;
let nameColumnIndex = -1;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const nameIdx = row.findIndex(cell => cell && String(cell).includes('اسم الطالب'));
  
  if (nameIdx !== -1) {
    headerRowIndex = i;
    nameColumnIndex = nameIdx;
    break;
  }
}

const students = [];
for (let i = headerRowIndex + 1; i < rows.length; i++) {
  const row = rows[i];
  const studentName = row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : '';
  if (studentName) {
    students.push({
      name: studentName,
      class: className,
      division: division
    });
  }
}

console.log('\nTotal Students:', students.length);
console.log('\nFirst 5 Students:');
students.slice(0, 5).forEach((s, i) => {
  console.log(`${i + 1}. ${s.name} - ${s.class} ${s.division}`);
});

console.log('\n=== Summary ===');
console.log(`✅ Successfully extracted ${students.length} students from class "${className}" division "${division}"`);

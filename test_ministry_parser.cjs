const XLSX = require('xlsx');

// Test the parser logic
const ministryFile = 'attached_assets/EL_StudentInfoReport_1760282285656.xls';
const workbook = XLSX.readFile(ministryFile);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Extract class and division
let className = '';
let division = '';

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  
  const classIndex = row.findIndex(cell => 
    cell && String(cell).trim() === 'الصف'
  );
  if (classIndex !== -1 && row[classIndex - 2]) {
    className = String(row[classIndex - 2]).trim();
  }
  
  const divisionIndex = row.findIndex(cell => 
    cell && String(cell).trim() === 'الشعبة'
  );
  if (divisionIndex !== -1 && row[divisionIndex - 2]) {
    division = String(row[divisionIndex - 2]).trim();
  }
}

console.log('Extracted Class:', className);
console.log('Extracted Division:', division);

// Find header and students
let headerRowIndex = -1;
let nameColumnIndex = -1;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const nameIdx = row.findIndex(cell => 
    cell && String(cell).includes('اسم الطالب')
  );
  
  if (nameIdx !== -1) {
    headerRowIndex = i;
    nameColumnIndex = nameIdx;
    break;
  }
}

console.log('Header Row Index:', headerRowIndex);
console.log('Name Column Index:', nameColumnIndex);

// Extract students
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

console.log('\nTotal Students Found:', students.length);
console.log('\nFirst 5 Students:');
students.slice(0, 5).forEach((s, i) => {
  console.log(`${i + 1}. ${s.name} - ${s.class} ${s.division}`);
});

const XLSX = require('xlsx');

const ministryFile = 'attached_assets/EL_StudentInfoReport_1760282285656.xls';
const workbook = XLSX.readFile(ministryFile);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Find class row
console.log('=== Looking for Class ===');
for (let i = 0; i < 20; i++) {
  const row = rows[i];
  const classIndex = row.findIndex(cell => cell && String(cell).trim() === 'الصف');
  if (classIndex !== -1) {
    console.log(`Row ${i}:`, row);
    console.log(`Found "الصف" at index ${classIndex}`);
    console.log(`Value at index ${classIndex - 1}:`, row[classIndex - 1]);
    console.log(`Value at index ${classIndex - 2}:`, row[classIndex - 2]);
    console.log(`Value at index ${classIndex - 3}:`, row[classIndex - 3]);
    console.log(`Value at index ${classIndex - 4}:`, row[classIndex - 4]);
  }
}

console.log('\n=== Looking for Division ===');
for (let i = 0; i < 20; i++) {
  const row = rows[i];
  const divIndex = row.findIndex(cell => cell && String(cell).trim() === 'الشعبة');
  if (divIndex !== -1) {
    console.log(`Row ${i}:`, row);
    console.log(`Found "الشعبة" at index ${divIndex}`);
    console.log(`Value at index ${divIndex - 1}:`, row[divIndex - 1]);
    console.log(`Value at index ${divIndex - 2}:`, row[divIndex - 2]);
    console.log(`Value at index ${divIndex - 3}:`, row[divIndex - 3]);
    console.log(`Value at index ${divIndex - 4}:`, row[divIndex - 4]);
  }
}

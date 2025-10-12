const XLSX = require('xlsx');

const ministryFile = 'attached_assets/EL_StudentInfoReport_1760282285656.xls';
const workbook = XLSX.readFile(ministryFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Try different parsing methods
console.log('=== Method 1: Default JSON ===');
const data1 = XLSX.utils.sheet_to_json(worksheet);
console.log('Total rows:', data1.length);
console.log('Rows 0-5:', JSON.stringify(data1.slice(0, 6), null, 2));

console.log('\n=== Method 2: With Header Array ===');
const data2 = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Total rows:', data2.length);
console.log('All rows:');
data2.forEach((row, i) => {
  if (row && row.length > 0) {
    console.log(`Row ${i}:`, JSON.stringify(row));
  }
});

console.log('\n=== Method 3: Raw Range ===');
const range = XLSX.utils.decode_range(worksheet['!ref']);
console.log('Range:', worksheet['!ref']);
console.log('Start:', range.s, 'End:', range.e);

const XLSX = require('xlsx');

// Read the ministry file
const ministryFile = 'attached_assets/EL_StudentInfoReport_1760282285656.xls';
const workbook = XLSX.readFile(ministryFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('=== Ministry File Structure ===');
console.log('Sheet Name:', sheetName);
console.log('Total Rows:', data.length);
console.log('\n=== First 3 Rows (Sample Data) ===');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

console.log('\n=== Column Names ===');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

// Extract unique classes and divisions
const classMap = new Map();
data.forEach(row => {
  const className = row['الصف'] || row['Class'] || '';
  const division = row['الشعبة'] || row['Division'] || '';
  if (className && division) {
    if (!classMap.has(className)) {
      classMap.set(className, new Set());
    }
    classMap.get(className).add(division);
  }
});

console.log('\n=== Classes & Divisions Found ===');
classMap.forEach((divisions, className) => {
  console.log(`${className}: ${Array.from(divisions).join(', ')}`);
});

// Read the competitor output file
const competitorFile = 'attached_assets/سجلات_العلامات_النهائية_1760282443118.xlsx';
const wb2 = XLSX.readFile(competitorFile);
console.log('\n=== Competitor File Sheets ===');
console.log('Sheet Names:', wb2.SheetNames);
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data2 = XLSX.utils.sheet_to_json(ws2);
console.log('First Sheet - Total Rows:', data2.length);
console.log('First 2 Rows:', JSON.stringify(data2.slice(0, 2), null, 2));

// Read the template file
const templateFile = 'attached_assets/mark_s_1760282621051.xlsx';
const wb3 = XLSX.readFile(templateFile);
console.log('\n=== Template File (mark_s) ===');
console.log('Sheet Names:', wb3.SheetNames);
const ws3 = wb3.Sheets[wb3.SheetNames[0]];
const data3 = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: '' });
console.log('First 15 Rows (raw):');
data3.slice(0, 15).forEach((row, i) => {
  console.log(`Row ${i}:`, JSON.stringify(row));
});

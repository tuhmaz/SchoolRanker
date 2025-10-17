// Quick diagnostic reader for ministry Excel exports
// Usage: node scripts/read_ministry.cjs <path-to-xls/xlsx>
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function toRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

function findLabel(rows, pattern, scanRows = 30) {
  for (let i = 0; i < Math.min(rows.length, scanRows); i++) {
    const row = rows[i];
    const idx = row.findIndex((cell) => cell && pattern.test(String(cell)));
    if (idx !== -1) return { r: i, c: idx };
  }
  return null;
}

function pickNeighborValue(row, idx) {
  // try left neighbors first
  for (let j = idx - 1; j >= 0; j--) {
    const val = String(row[j] ?? '').trim();
    if (val && val !== ':') return val;
  }
  // then right neighbors
  for (let j = idx + 1; j < row.length; j++) {
    const val = String(row[j] ?? '').trim();
    if (val && val !== ':') return val;
  }
  return '';
}

function detectClass(rows) {
  let className = rows[6]?.[3] ? String(rows[6][3]).trim() : '';
  if (className) return className;
  const loc = findLabel(rows, /الصف/, 20);
  if (loc) {
    className = pickNeighborValue(rows[loc.r], loc.c);
  }
  return className || '';
}

function detectDivision(rows) {
  let division = rows[14]?.[3] ? String(rows[14][3]).trim() : '';
  if (division) return division;
  const loc = findLabel(rows, /الشعبة/, 30);
  if (loc) {
    division = pickNeighborValue(rows[loc.r], loc.c);
  }
  return division || '';
}

function detectSubject(rows) {
  let subject = '';
  const loc = findLabel(rows, /(المبحث|المادة\s*الدراسية|\bالمادة\b)/, 20);
  if (loc) {
    subject = pickNeighborValue(rows[loc.r], loc.c);
  }
  return subject || '';
}

function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameIdx = row.findIndex((cell) => cell && /(اسم\s*الطالب|\bالاسم\b)/.test(String(cell)));
    if (nameIdx !== -1) {
      const divisionIdx = row.findIndex((cell) => cell && /الشعبة/.test(String(cell)));
      const natIdIdx = row.findIndex((cell) => cell && /(رقم\s*(الإثبات|الهوية))/.test(String(cell)));
      const birthIdx = row.findIndex((cell) => cell && /تاريخ\s*الميلاد/.test(String(cell)));
      const statusIdx = row.findIndex((cell) => cell && /حالة\s*القيد/.test(String(cell)));
      return { headerRowIndex: i, nameIdx, divisionIdx, natIdIdx, birthIdx, statusIdx };
    }
  }
  return null;
}

function main() {
  const file = process.argv[2] || 'EL_StudentInfoReport.xls';
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(1);
  }
  const wb = XLSX.readFile(file);
  console.log('Workbook:', path.basename(file));
  console.log('Sheets:', wb.SheetNames.length, wb.SheetNames.join(', '));

  const classMap = new Map(); // class -> division -> subjects
  const perSheet = [];

  let fallbackClassName = '';
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = toRows(ws);
    let className = detectClass(rows);
    let division = detectDivision(rows);
    let subject = detectSubject(rows);

    if (!className && fallbackClassName) className = fallbackClassName;
    if (className && !fallbackClassName) fallbackClassName = className;

    // Ensure class/division are registered
    if (className && division) {
      if (!classMap.has(className)) classMap.set(className, new Map());
      const divMap = classMap.get(className);
      if (!divMap.has(division)) divMap.set(division, new Set());
      if (subject) divMap.get(division).add(subject); console.log('REGISTER', sheetName, '=>', className, division);
    }

    let students = 0;
    const hdr = findHeader(rows);
    if (hdr) {
      for (let r = hdr.headerRowIndex + 1; r < rows.length; r++) {
        const name = String(rows[r][hdr.nameIdx] ?? '').trim();
        if (name) {
          students++;
          if (hdr.divisionIdx !== -1) {
            const dval = String(rows[r][hdr.divisionIdx] ?? '').trim();
            if (dval) division = dval; // row overrides detected division
          }
        }
      }
    }
    perSheet.push({ sheetName, className, division, subject, students, hasHeader: !!hdr });
  }

  console.log('\nPer-sheet summary:');
  for (const s of perSheet) {
    console.log(`- ${s.sheetName}: class="${s.className}" division="${s.division}" subject="${s.subject}" students=${s.students} header=${s.hasHeader}`);
  }

  const flat = [];
  for (const [cls, divMap] of classMap.entries()) {
    for (const [div, subjects] of divMap.entries()) {
      flat.push({ className: cls, division: div, subjects: Array.from(subjects) });
    }
  }
  console.log('\nClasses (flattened):', flat.length);
  flat.slice(0, 20).forEach((c, i) => {
    console.log(`${i + 1}. ${c.className} - ${c.division} :: subjects=[${c.subjects.join(', ')}]`);
  });
}

main();

import ExcelJS from "exceljs";
import path from "path";

async function run() {
  const id = process.argv[2] || "";
  if (!id) {
    console.error("Usage: tsx server/inspectExport.ts <id>");
    process.exit(1);
  }
  const exportPath = path.resolve(process.cwd(), "exports", `دفتر_العلامات_الرئيسي_${id}.xlsx`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(exportPath);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("Main sheet not found");

  const maxRows = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0, 400);
  const maxCols = sheet.columnCount || 18;

  let headerRow: number | null = null;
  let firstNameRow: number | null = null;
  let classCell: string | null = null;
  let divisionCell: string | null = null;
  let subjectCell: string | null = null;

  for (let r = 1; r <= maxRows; r++) {
    const aVal = sheet.getCell(`A${r}`).value;
    const bVal = sheet.getCell(`B${r}`).value;
    const aStr = aVal != null ? String(aVal) : "";
    const bStr = bVal != null ? String(bVal) : "";
    if (/الرقم\s*المتسلسل/.test(aStr) && /الاس\S*م/.test(bStr)) {
      headerRow = r;
      break;
    }
  }

  for (let r = 1; r <= maxRows; r++) {
    const d = sheet.getCell(`D${r}`).value;
    const i = sheet.getCell(`I${r}`).value;
    const o = sheet.getCell(r, 15).value; // column O
    const dStr = d != null ? String(d) : "";
    const iStr = i != null ? String(i) : "";
    const oStr = o != null ? String(o) : "";
    if (!classCell && /الصف\s*:/.test(dStr)) classCell = `D${r}`;
    if (!divisionCell && /الشعبه|الشعبة/.test(iStr)) divisionCell = `I${r}`;
    if (!subjectCell && oStr && oStr.trim().length > 0) subjectCell = `O${r}`;
  }

  if (headerRow != null) {
    for (let r = headerRow + 1; r <= headerRow + 10; r++) {
      const a = sheet.getCell(`A${r}`).value;
      const b = sheet.getCell(`B${r}`).value;
      if (typeof a === "number" && b != null && String(b).trim().length > 0) {
        firstNameRow = r;
        break;
      }
    }
  }

  console.log({ exportPath, headerRow, classCell, divisionCell, subjectCell, firstNameRow });
}

run().catch(err => { console.error(err); process.exit(1); });
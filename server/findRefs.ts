import ExcelJS from "exceljs";
import path from "path";

async function run() {
  const templatePath = path.resolve(process.cwd(), "templates", "alem_a.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("Sheet 1 not found");

  const results: Array<{ row: number; J?: number; K?: number }> = [];
  const maxRows = Math.max(sheet.rowCount, sheet.actualRowCount ?? 0, 400);
  for (let r = 1; r <= maxRows; r++) {
    const J = sheet.getCell(`J${r}`).value;
    const K = sheet.getCell(`K${r}`).value;
    const jNum = typeof J === "number" ? J : undefined;
    const kNum = typeof K === "number" ? K : undefined;
    if (jNum != null || kNum != null) {
      results.push({ row: r, J: jNum, K: kNum });
    }
  }

  const headerRowCandidate = (() => {
    for (let r = 1; r <= maxRows; r++) {
      const a = sheet.getCell(`A${r}`).value;
      const b = sheet.getCell(`B${r}`).value;
      const aStr = typeof a === "string" ? a.trim() : String(a ?? "").trim();
      const bStr = typeof b === "string" ? b.trim() : String(b ?? "").trim();
      if (/الرقم\s*المتسلسل/.test(aStr) && /الاس\S*م/.test(bStr)) {
        return r;
      }
    }
    return null;
  })();

  console.log("Found ref rows (first 20):");
  results.slice(0, 20).forEach((e) => {
    console.log(`Row ${e.row}: J=${e.J ?? ""} K=${e.K ?? ""}`);
  });
  console.log("Total refs:", results.length);
  console.log("Header row (serial/name):", headerRowCandidate);

  if (headerRowCandidate != null && results.length > 0) {
    const firstRefRow = results[0].row;
    const delta = headerRowCandidate - firstRefRow;
    console.log(`delta (headerRow - firstRefRow) = ${delta}`);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
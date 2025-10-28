import * as XLSX from "xlsx";

function inspectWorkbook(path: string) {
  const workbook = XLSX.readFile(path, { cellDates: true, raw: false });
  console.log(`Sheets (${workbook.SheetNames.length}):`, workbook.SheetNames.join(", "));
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
    console.log("\n===", sheetName, "===");
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      console.log(i.toString().padStart(3, " "), "|", row.map((cell) => (typeof cell === "string" ? cell.trim() : String(cell))).join(" | "));
    }
  }
}

const [, , filePath] = process.argv;
if (!filePath) {
  console.error("Usage: npx tsx scripts/inspect-xls.ts <path>");
  process.exit(1);
}

inspectWorkbook(filePath);

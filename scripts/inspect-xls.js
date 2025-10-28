const XLSX = require("xlsx");

function inspectWorkbook(path) {
  const workbook = XLSX.readFile(path, { cellDates: true, raw: false });
  console.log(`Sheets (${workbook.SheetNames.length}):`, workbook.SheetNames.join(", "));
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    console.log("\n===", sheetName, "===");
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i];
      const formatted = row
        .map((cell) => {
          if (cell == null) return "";
          const text = typeof cell === "string" ? cell : String(cell);
          return text.replace(/\s+/g, " ").trim();
        })
        .join(" | ");
      console.log(String(i).padStart(3, " "), "|", formatted);
    }
  }
}

const [, , filePath] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/inspect-xls.js <path>");
  process.exit(1);
}

inspectWorkbook(filePath);

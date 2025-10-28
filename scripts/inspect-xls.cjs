const XLSX = require("xlsx");

function inspectWorkbook(path, filter) {
  const workbook = XLSX.readFile(path, { cellDates: true, raw: false });
  console.log(`Sheets (${workbook.SheetNames.length}):`, workbook.SheetNames.join(", "));
  for (const sheetName of workbook.SheetNames) {
    if (filter && sheetName.toLowerCase() !== filter.toLowerCase()) {
      continue;
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const cellsToInspect = ["C14", "D14", "E14", "T20", "U20", "V20"];
    console.log("Cell snapshot:");
    for (const cell of cellsToInspect) {
      const value = worksheet[cell]?.v ?? "";
      console.log(`  ${cell}:`, value);
    }
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    console.log("\n===", sheetName, "===");
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
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

const [, , filePath, sheetFilter] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/inspect-xls.cjs <path>");
  process.exit(1);
}

inspectWorkbook(filePath, sheetFilter);

import ExcelJS from "exceljs";
import path from "path";

async function run() {
  const templatePath = path.resolve(process.cwd(), "templates", "alem_a.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Sheet 1 not found");

  const maxRow = 200;
  const maxCol = 20;

  for (let rowNumber = 1; rowNumber <= maxRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const entries: string[] = [];
    for (let colNumber = 1; colNumber <= maxCol; colNumber++) {
      const cell = row.getCell(colNumber);
      let value = "";
      if (cell.value != null) {
        if (typeof cell.value === "object") {
          if ((cell.value as any).formula) value = `={${(cell.value as any).formula}}`;
          else if ((cell.value as any).sharedFormula) value = `#shared:${(cell.value as any).sharedFormula}`;
          else if ((cell.value as any).text) value = String((cell.value as any).text);
          else value = JSON.stringify(cell.value);
        } else {
          value = String(cell.value);
        }
      }
      const trimmed = value.trim();
      if (trimmed) {
        entries.push(`${cell.address}=${trimmed}`);
      }
    }
    const hasContent = entries.length > 0;
    if (hasContent) {
      console.log(`${rowNumber.toString().padStart(3, "0")}: ${entries.join(" | ")}`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

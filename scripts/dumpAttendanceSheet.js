import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(scriptDir, "../templates/Attendance and absence.xlsx"));
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
  console.log("Sheets:", sheetNames);

  const targetMonth = process.argv[2] || "تشرين الأول";
  const sheet = workbook.worksheets.find((s) => s.name.trim() === targetMonth.trim());
  if (!sheet) {
    console.error(`Sheet not found for '${targetMonth}'`);
    process.exit(1);
  }

  const toCol = (num) => {
    let n = num;
    let col = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      n = Math.floor((n - 1) / 26);
    }
    return col;
  };

  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > 40) return false;
    const preview = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > 25) return;
      let text = "";
      const { value } = cell;
      if (value == null) {
        text = "";
      } else if (typeof value === "string" || typeof value === "number") {
        text = value;
      } else if (Array.isArray(value?.richText)) {
        text = value.richText.map((part) => part?.text ?? "").join("");
      } else if (value?.text) {
        text = value.text;
      } else if (value?.result != null) {
        text = value.result;
      } else {
        text = "[obj]";
      }
      if (text !== "") {
        preview.push(`${toCol(colNumber)}=${text}`);
      }
    });
    if (preview.length > 0) {
      console.log(`${rowNumber}: ${preview.join(" | ")}`);
    }
  });
})();

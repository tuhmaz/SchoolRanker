const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.resolve(__dirname, "../templates/Student_schedule.xlsx");
    
    await workbook.xlsx.readFile(templatePath);
    
    console.log("\n=== Student Schedule Template Analysis ===\n");
    console.log(`Total Sheets: ${workbook.worksheets.length}`);
    console.log(`Sheet Names: ${workbook.worksheets.map(s => s.name).join(", ")}\n`);
    
    // تحليل كل ورقة
    workbook.worksheets.forEach((sheet, sheetIdx) => {
      console.log(`\n--- Sheet ${sheetIdx + 1}: ${sheet.name} ---`);
      console.log(`Dimensions: ${sheet.dimensions?.address || "N/A"}`);
      
      // قراءة أول 15 صف
      const maxRows = Math.min(15, sheet.rowCount || 15);
      const maxCols = Math.min(10, sheet.columnCount || 10);
      
      console.log(`\nFirst ${maxRows} rows (${maxCols} columns):`);
      console.log("─".repeat(100));
      
      for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
        const row = sheet.getRow(rowNum);
        const cells = [];
        
        for (let colNum = 1; colNum <= maxCols; colNum++) {
          const cell = row.getCell(colNum);
          let value = "";
          
          if (cell.value == null) {
            value = "";
          } else if (typeof cell.value === "string") {
            value = cell.value;
          } else if (typeof cell.value === "number") {
            value = String(cell.value);
          } else if (typeof cell.value === "object") {
            if (cell.value.richText) {
              value = cell.value.richText.map(p => p?.text ?? "").join("");
            } else if (cell.value.text) {
              value = cell.value.text;
            } else if (cell.value.result !== undefined) {
              value = String(cell.value.result);
            }
          }
          
          cells.push((value || "").substring(0, 15).padEnd(15));
        }
        
        console.log(`Row ${String(rowNum).padStart(2)}: ${cells.join(" | ")}`);
      }
      
      // تحليل الأعمدة
      console.log("\n\nColumn Analysis:");
      console.log("─".repeat(100));
      
      if (sheet.columns) {
        sheet.columns.slice(0, maxCols).forEach((col, idx) => {
          console.log(`Col ${idx + 1}: width=${col.width || "auto"}, hidden=${col.hidden || false}`);
        });
      }
      
      // تحليل الخلايا المدمجة
      const merges = sheet.model?.merges;
      if (Array.isArray(merges) && merges.length > 0) {
        console.log("\n\nMerged Cells:");
        console.log("─".repeat(100));
        merges.slice(0, 10).forEach(merge => {
          console.log(`  ${merge}`);
        });
        if (merges.length > 10) {
          console.log(`  ... and ${merges.length - 10} more`);
        }
      }
    });
    
    console.log("\n=== Analysis Complete ===\n");
  } catch (error) {
    console.error("Error reading template:", error.message);
    process.exit(1);
  }
})();

const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.resolve(__dirname, "../templates/Student_schedule.xlsx");
    
    await workbook.xlsx.readFile(templatePath);
    
    const scheduleSheet = workbook.worksheets[0];
    
    console.log("\n=== Student Schedule - Detailed Analysis ===\n");
    console.log(`Sheet Name: ${scheduleSheet.name}`);
    console.log(`Dimensions: ${scheduleSheet.dimensions?.address || "N/A"}`);
    
    // قراءة الصفوف الأولى لفهم البنية
    console.log("\n--- Header Structure ---");
    
    const row1 = scheduleSheet.getRow(1);
    const row2 = scheduleSheet.getRow(2);
    const row3 = scheduleSheet.getRow(3);
    
    console.log("\nRow 1 (Title/Header):");
    let titleCells = [];
    for (let i = 1; i <= 15; i++) {
      const val = row1.getCell(i).value;
      if (val) titleCells.push(`Col${i}: ${val}`);
    }
    console.log(titleCells.join(" | "));
    
    console.log("\nRow 2 (Sub-header):");
    let subHeaderCells = [];
    for (let i = 1; i <= 15; i++) {
      const val = row2.getCell(i).value;
      if (val) subHeaderCells.push(`Col${i}: ${val}`);
    }
    console.log(subHeaderCells.join(" | "));
    
    console.log("\nRow 3 (Column Names):");
    let colNames = [];
    for (let i = 1; i <= 15; i++) {
      const val = row3.getCell(i).value;
      const text = typeof val === "string" ? val : (val?.text || "");
      colNames.push(`${i}: ${text}`);
    }
    console.log(colNames.join(" | "));
    
    // عد الصفوف والأعمدة المستخدمة
    console.log("\n--- Data Statistics ---");
    
    let dataRows = 0;
    let maxCol = 0;
    
    scheduleSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        let hasData = false;
        row.eachCell((cell, colNumber) => {
          if (cell.value) {
            hasData = true;
            maxCol = Math.max(maxCol, colNumber);
          }
        });
        if (hasData) dataRows++;
      }
    });
    
    console.log(`Total Data Rows (after header): ${dataRows}`);
    console.log(`Max Column Used: ${maxCol}`);
    
    // تحليل الأعمدة
    console.log("\n--- Column Details ---");
    for (let i = 1; i <= Math.min(maxCol, 20); i++) {
      const col = scheduleSheet.getColumn(i);
      const header = scheduleSheet.getCell(`${String.fromCharCode(64 + i)}3`).value;
      console.log(`Col ${i} (${String.fromCharCode(64 + i)}): "${header}" - width: ${col.width || "auto"}`);
    }
    
    // عينة من البيانات
    console.log("\n--- Data Sample (First 5 students) ---");
    for (let rowNum = 4; rowNum <= 8; rowNum++) {
      const row = scheduleSheet.getRow(rowNum);
      const serial = row.getCell(1).value;
      const firstName = row.getCell(2).value;
      const fatherName = row.getCell(3).value;
      const grandName = row.getCell(4).value;
      const familyName = row.getCell(5).value;
      
      console.log(`Row ${rowNum}: #${serial} - ${firstName} ${fatherName} ${grandName} ${familyName}`);
    }
    
    console.log("\n=== Analysis Complete ===\n");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();

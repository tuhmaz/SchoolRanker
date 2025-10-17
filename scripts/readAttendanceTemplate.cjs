const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.resolve(__dirname, "../templates/Attendance and absence.xlsx");
  
  await workbook.xlsx.readFile(templatePath);
  
  console.log("=== Attendance Template Analysis ===\n");
  console.log(`Total Sheets: ${workbook.worksheets.length}`);
  console.log(`Sheet Names: ${workbook.worksheets.map(s => s.name).join(", ")}\n`);
  
  // تحليل كل شهر
  workbook.worksheets.forEach((sheet) => {
    console.log(`\n--- Sheet: ${sheet.name} ---`);
    
    // قراءة صف رقم اليوم (الصف 2)
    const dayNumberRow = sheet.getRow(2);
    const dayNameRow = sheet.getRow(3);
    
    const days = [];
    dayNumberRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;
      let text = "";
      
      if (value == null) {
        text = "";
      } else if (typeof value === "string") {
        text = value;
      } else if (typeof value === "number") {
        text = String(value);
      } else if (typeof value === "object") {
        if (value.richText) {
          text = value.richText.map(p => p?.text ?? "").join("");
        } else if (value.text) {
          text = value.text;
        }
      }
      
      text = text.trim();
      
      // استخراج الأرقام فقط
      const dayNum = text.replace(/[^\d]/g, "");
      
      if (dayNum && colNumber > 5) { // بعد أعمدة الأسماء
        const dayNameCell = dayNameRow.getCell(colNumber);
        let dayName = "";
        
        if (dayNameCell.value) {
          if (typeof dayNameCell.value === "string") {
            dayName = dayNameCell.value;
          } else if (typeof dayNameCell.value === "object") {
            if (dayNameCell.value.richText) {
              dayName = dayNameCell.value.richText.map(p => p?.text ?? "").join("");
            } else if (dayNameCell.value.text) {
              dayName = dayNameCell.value.text;
            }
          }
        }
        
        days.push({
          col: colNumber,
          day: dayNum,
          name: dayName.trim()
        });
      }
    });
    
    console.log(`Total Days: ${days.length}`);
    
    // عرض الأيام التي تحتوي على عطل أو نصوص خاصة
    const specialDays = days.filter(d => 
      d.name && (
        d.name.includes("عطلة") || 
        d.name.includes("عطله") ||
        d.name.includes("جمعة") ||
        d.name.includes("سبت")
      )
    );
    
    if (specialDays.length > 0) {
      console.log("\nSpecial Days (Holidays/Weekends):");
      specialDays.forEach(d => {
        console.log(`  Day ${d.day}: ${d.name}`);
      });
    }
    
    // عرض أول 5 أيام كعينة
    console.log("\nFirst 5 Days Sample:");
    days.slice(0, 5).forEach(d => {
      console.log(`  Day ${d.day} (Col ${d.col}): ${d.name || "(empty)"}`);
    });
  });
  
  console.log("\n=== Analysis Complete ===");
})();

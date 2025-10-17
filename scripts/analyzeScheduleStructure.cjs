const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.resolve(__dirname, "../templates/Student_schedule.xlsx");
    
    await workbook.xlsx.readFile(templatePath);
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     تحليل شامل لنموذج جدول الغياب الشهري                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    console.log(`📊 إجمالي الأوراق: ${workbook.worksheets.length}`);
    console.log(`📋 أسماء الأوراق: ${workbook.worksheets.map(s => `"${s.name}"`).join(", ")}\n`);
    
    // تحليل الفصل الدراسي الأول والثاني
    const semester1Months = ["آب", "ايلول", "تشرين الاول", "تشرين الثاني", "كانون الاول"];
    const semester2Months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران"];
    
    console.log("📅 توزيع الأشهر على الفصول:");
    console.log("─".repeat(60));
    console.log("الفصل الدراسي الأول (5 أشهر):");
    semester1Months.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    console.log("\nالفصل الدراسي الثاني (6 أشهر):");
    semester2Months.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    
    // تحليل كل ورقة
    console.log("\n" + "═".repeat(60));
    console.log("تحليل تفصيلي لكل ورقة:");
    console.log("═".repeat(60) + "\n");
    
    workbook.worksheets.forEach((sheet, sheetIdx) => {
      console.log(`\n📄 الورقة ${sheetIdx + 1}: "${sheet.name}"`);
      console.log("─".repeat(60));
      
      // معلومات عامة
      console.log(`  • الأبعاد: ${sheet.dimensions?.address || "N/A"}`);
      console.log(`  • عدد الصفوف: ${sheet.rowCount || "N/A"}`);
      console.log(`  • عدد الأعمدة: ${sheet.columnCount || "N/A"}`);
      
      // قراءة الصفوف الأولى
      const row1 = sheet.getRow(1);
      const row2 = sheet.getRow(2);
      const row3 = sheet.getRow(3);
      
      let row1Text = [];
      let row2Text = [];
      let row3Text = [];
      
      for (let i = 1; i <= 6; i++) {
        const val1 = row1.getCell(i).value;
        const val2 = row2.getCell(i).value;
        const val3 = row3.getCell(i).value;
        
        row1Text.push(val1 ? String(val1).substring(0, 10) : "");
        row2Text.push(val2 ? String(val2).substring(0, 10) : "");
        row3Text.push(val3 ? String(val3).substring(0, 10) : "");
      }
      
      console.log(`\n  الصف 1: ${row1Text.join(" | ")}`);
      console.log(`  الصف 2: ${row2Text.join(" | ")}`);
      console.log(`  الصف 3: ${row3Text.join(" | ")}`);
      
      // عد الصفوف بالبيانات
      let dataRowCount = 0;
      sheet.eachRow((row, rowNum) => {
        if (rowNum > 3) {
          let hasData = false;
          row.eachCell((cell) => {
            if (cell.value) hasData = true;
          });
          if (hasData) dataRowCount++;
        }
      });
      
      console.log(`\n  📊 عدد صفوف البيانات: ${dataRowCount}`);
      
      // الأعمدة المستخدمة
      let maxCol = 0;
      sheet.eachRow((row) => {
        row.eachCell((cell, colNum) => {
          if (cell.value) maxCol = Math.max(maxCol, colNum);
        });
      });
      
      console.log(`  📍 أقصى عمود مستخدم: ${maxCol}`);
      
      // معلومات الخلايا المدمجة
      const merges = sheet.model?.merges || [];
      if (merges.length > 0) {
        console.log(`  🔗 عدد الخلايا المدمجة: ${merges.length}`);
        console.log(`     أول 5 دمجات: ${merges.slice(0, 5).join(", ")}`);
      }
    });
    
    // ملخص البنية المقترحة
    console.log("\n" + "═".repeat(60));
    console.log("💡 البنية المقترحة للنموذج:");
    console.log("═".repeat(60));
    console.log(`
الشيت الأول: "الفصل الدراسي الأول"
  • الأشهر: آب، ايلول، تشرين الأول، تشرين الثاني، كانون الأول
  • الأعمدة: A-E (الأسماء) + F-O (الأشهر الخمسة)
  • الصفوف: 1-3 (رؤوس) + 4+ (بيانات الطلاب)

الشيت الثاني: "الفصل الدراسي الثاني"
  • الأشهر: كانون الثاني، شباط، آذار، نيسان، أيار، حزيران
  • الأعمدة: A-E (الأسماء) + F-Q (الأشهر الستة)
  • الصفوف: 1-3 (رؤوس) + 4+ (بيانات الطلاب)
    `);
    
    console.log("\n✅ تم الانتهاء من التحليل\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    let templatePath = path.resolve(__dirname, "../templates/EL_StudentInfoReport.xls");
    
    // Try alternative path
    const fs = require("fs");
    if (!fs.existsSync(templatePath)) {
      templatePath = path.resolve(__dirname, "../EL_StudentInfoReport.xls");
    }
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`File not found at ${templatePath}`);
    }
    
    await workbook.xlsx.readFile(templatePath);
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     تحليل بنية أسماء الطلاب في ملف الطلبة                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    console.log(`📊 إجمالي الأوراق: ${workbook.worksheets.length}`);
    console.log(`📋 أسماء الأوراق: ${workbook.worksheets.map(s => `"${s.name}"`).join(", ")}\n`);
    
    // تحليل أول ورقة
    const sheet = workbook.worksheets[0];
    console.log(`\n📄 تحليل الورقة الأولى: "${sheet.name}"`);
    console.log("═".repeat(60) + "\n");
    
    // قراءة رؤوس الأعمدة
    console.log("📍 رؤوس الأعمدة (الصف الأول):");
    console.log("─".repeat(60));
    
    const headerRow = sheet.getRow(1);
    const headers = [];
    
    for (let i = 1; i <= 20; i++) {
      const cell = headerRow.getCell(i);
      const value = cell.value;
      
      if (value) {
        let text = "";
        if (typeof value === "string") {
          text = value;
        } else if (typeof value === "object") {
          if (value.richText) {
            text = value.richText.map(p => p?.text ?? "").join("");
          } else if (value.text) {
            text = value.text;
          }
        }
        
        headers.push({ col: i, name: text });
        console.log(`  العمود ${i} (${String.fromCharCode(64 + i)}): "${text}"`);
      }
    }
    
    // عرض عينة من البيانات
    console.log("\n\n📊 عينة من بيانات الطلاب (أول 5 طلاب):");
    console.log("═".repeat(60) + "\n");
    
    let studentCount = 0;
    const samples = [];
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && studentCount < 5) {
        const rowData = {};
        
        for (let i = 1; i <= 20; i++) {
          const cell = row.getCell(i);
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
            }
          }
          
          const header = headers.find(h => h.col === i);
          if (header && value) {
            rowData[header.name] = value;
          }
        }
        
        samples.push(rowData);
        studentCount++;
      }
    });
    
    samples.forEach((student, idx) => {
      console.log(`\n🎓 الطالب ${idx + 1}:`);
      console.log("─".repeat(60));
      Object.entries(student).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
      });
    });
    
    // تحليل الأسماء
    console.log("\n\n" + "═".repeat(60));
    console.log("🔍 تحليل طريقة توزيع الأسماء:");
    console.log("═".repeat(60) + "\n");
    
    // البحث عن أعمدة الأسماء
    const nameColumns = headers.filter(h => 
      h.name.includes("اسم") || 
      h.name.includes("الاسم") ||
      h.name.includes("Name") ||
      h.name.includes("name")
    );
    
    console.log("📌 أعمدة الأسماء المكتشفة:");
    nameColumns.forEach(col => {
      console.log(`  • العمود ${col.col} (${String.fromCharCode(64 + col.col)}): "${col.name}"`);
    });
    
    // عرض مثال على توزيع الاسم
    if (samples.length > 0) {
      console.log("\n\n💡 مثال على توزيع الاسم الكامل:");
      console.log("─".repeat(60));
      
      const firstStudent = samples[0];
      console.log("\nالاسم الكامل:");
      
      const nameFields = ["الاسم الاول", "اسم الاب", "اسم الجد", "اسم العائلة"];
      nameFields.forEach(field => {
        if (firstStudent[field]) {
          console.log(`  • ${field}: "${firstStudent[field]}"`);
        }
      });
      
      const fullName = nameFields
        .map(f => firstStudent[f] || "")
        .filter(Boolean)
        .join(" ");
      
      console.log(`\n✅ الاسم المركب: "${fullName}"`);
    }
    
    console.log("\n\n" + "═".repeat(60));
    console.log("📋 الخلاصة:");
    console.log("═".repeat(60));
    console.log(`
الطريقة المستخدمة لتوزيع الأسماء:
1. الاسم الأول (First Name)
2. اسم الأب (Father's Name)
3. اسم الجد (Grand Father's Name)
4. اسم العائلة (Family Name)

عند دمج الأسماء: الاسم الأول + اسم الأب + اسم الجد + اسم العائلة
    `);
    
    console.log("\n✅ تم الانتهاء من التحليل\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

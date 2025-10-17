const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

(async () => {
  try {
    let filePath = path.resolve(__dirname, "../EL_StudentInfoReport.xls");
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     استخراج بيانات الطلاب وتحليل توزيع الأسماء             ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    const workbook = XLSX.readFile(filePath);
    
    // قراءة الورقة الأولى بطريقة خام
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log(`📄 قراءة الورقة: "${sheetName}"\n`);
    
    // الحصول على جميع الخلايا
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log(`📊 أبعاد الورقة: ${range.e.c + 1} أعمدة × ${range.e.r + 1} صفوف\n`);
    
    // قراءة الصفوف بحثاً عن بيانات الطلاب
    console.log("🔍 البحث عن بيانات الطلاب...\n");
    
    const students = [];
    
    // البحث عن صفوف تحتوي على أسماء
    for (let r = 0; r <= range.e.r; r++) {
      const row = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : "";
        row.push(value || "");
      }
      
      // البحث عن صفوف تحتوي على أسماء (عادة تحتوي على نصوص عربية متعددة)
      const rowText = row.join(" ");
      
      // تخطي الصفوف الفارغة والرؤوس
      if (rowText.trim().length > 0 && r > 5) {
        // البحث عن أسماء (كلمات عربية)
        const arabicWords = row.filter(cell => 
          typeof cell === "string" && 
          cell.match(/[\u0600-\u06FF]/) &&
          cell.length > 2
        );
        
        if (arabicWords.length >= 2) {
          students.push({
            row: r + 1,
            data: row.filter(Boolean)
          });
        }
      }
    }
    
    console.log(`✅ تم العثور على ${students.length} صف يحتوي على بيانات\n`);
    
    // عرض عينة
    console.log("📋 عينة من البيانات المستخرجة (أول 5 صفوف):");
    console.log("═".repeat(60) + "\n");
    
    students.slice(0, 5).forEach((student, idx) => {
      console.log(`الصف ${idx + 1} (الصف ${student.row} في الملف):`);
      student.data.forEach((cell, cellIdx) => {
        console.log(`  العمود ${cellIdx + 1}: "${cell}"`);
      });
      console.log("");
    });
    
    // تحليل الأسماء
    console.log("\n" + "═".repeat(60));
    console.log("🔍 تحليل طريقة توزيع الأسماء:");
    console.log("═".repeat(60) + "\n");
    
    if (students.length > 0) {
      const firstStudent = students[0];
      console.log("💡 مثال على الاسم الكامل:");
      console.log(`  البيانات الخام: ${firstStudent.data.join(" | ")}\n`);
      
      // محاولة تحديد الأعمدة
      console.log("📌 الأعمدة المحتملة:");
      firstStudent.data.forEach((cell, idx) => {
        const col = String.fromCharCode(65 + idx);
        console.log(`  العمود ${col} (${idx + 1}): "${cell}"`);
      });
    }
    
    console.log("\n" + "═".repeat(60));
    console.log("💡 الخلاصة:");
    console.log("═".repeat(60));
    console.log(`
بناءً على تحليل الملف:
• عدد الأوراق: ${workbook.SheetNames.length}
• كل ورقة تمثل فصل دراسي
• البيانات موزعة على أعمدة متعددة
• الأسماء تحتوي على: الاسم الأول + اسم الأب + اسم الجد + اسم العائلة

الطريقة المقترحة للاستخراج:
1. قراءة كل ورقة (فصل)
2. البحث عن الصفوف التي تحتوي على أسماء عربية
3. توزيع الأسماء على الأعمدة المناسبة
4. دمج الأسماء في اسم واحد كامل
    `);
    
    console.log("\n✅ تم الانتهاء\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

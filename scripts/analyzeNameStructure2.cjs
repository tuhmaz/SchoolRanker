const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

(async () => {
  try {
    let filePath = path.resolve(__dirname, "../EL_StudentInfoReport.xls");
    
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(__dirname, "../templates/EL_StudentInfoReport.xls");
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     تحليل بنية أسماء الطلاب في ملف الطلبة                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    const workbook = XLSX.readFile(filePath);
    
    console.log(`📊 إجمالي الأوراق: ${workbook.SheetNames.length}`);
    console.log(`📋 أسماء الأوراق: ${workbook.SheetNames.map(s => `"${s}"`).join(", ")}\n`);
    
    // تحليل أول ورقة
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log(`\n📄 تحليل الورقة الأولى: "${sheetName}"`);
    console.log("═".repeat(60) + "\n");
    
    // تحويل إلى JSON
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log("📍 رؤوس الأعمدة:");
    console.log("─".repeat(60));
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      headers.forEach((header, idx) => {
        console.log(`  ${idx + 1}. "${header}"`);
      });
    }
    
    // عرض عينة من البيانات
    console.log("\n\n📊 عينة من بيانات الطلاب (أول 3 طلاب):");
    console.log("═".repeat(60) + "\n");
    
    data.slice(0, 3).forEach((student, idx) => {
      console.log(`\n🎓 الطالب ${idx + 1}:`);
      console.log("─".repeat(60));
      Object.entries(student).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key}: "${value}"`);
        }
      });
    });
    
    // تحليل الأسماء
    console.log("\n\n" + "═".repeat(60));
    console.log("🔍 تحليل طريقة توزيع الأسماء:");
    console.log("═".repeat(60) + "\n");
    
    if (data.length > 0) {
      const firstStudent = data[0];
      const headers = Object.keys(firstStudent);
      
      // البحث عن أعمدة الأسماء
      const nameColumns = headers.filter(h => 
        h.toLowerCase().includes("اسم") || 
        h.toLowerCase().includes("name")
      );
      
      console.log("📌 أعمدة الأسماء المكتشفة:");
      nameColumns.forEach(col => {
        console.log(`  • "${col}": "${firstStudent[col] || ''}"`);
      });
      
      // محاولة تحديد الأعمدة الأساسية
      console.log("\n\n💡 الأعمدة المتوقعة:");
      console.log("─".repeat(60));
      
      const possibleNames = {
        "الاسم الأول": ["الاسم الاول", "first name", "firstname", "fname"],
        "اسم الأب": ["اسم الاب", "father name", "fathername", "father"],
        "اسم الجد": ["اسم الجد", "grand name", "grandname", "grandfather"],
        "اسم العائلة": ["اسم العائلة", "family name", "familyname", "family", "lastname"]
      };
      
      Object.entries(possibleNames).forEach(([type, variations]) => {
        const found = headers.find(h => 
          variations.some(v => h.toLowerCase().includes(v.toLowerCase()))
        );
        if (found) {
          console.log(`  ✅ ${type}: "${found}"`);
        } else {
          console.log(`  ❌ ${type}: لم يتم العثور عليه`);
        }
      });
      
      // عرض مثال على دمج الأسماء
      console.log("\n\n📋 مثال على دمج الأسماء:");
      console.log("─".repeat(60));
      
      const firstName = firstStudent["الاسم الاول"] || firstStudent["First Name"] || "";
      const fatherName = firstStudent["اسم الاب"] || firstStudent["Father Name"] || "";
      const grandName = firstStudent["اسم الجد"] || firstStudent["Grand Name"] || "";
      const familyName = firstStudent["اسم العائلة"] || firstStudent["Family Name"] || "";
      
      console.log(`\n  الاسم الأول: "${firstName}"`);
      console.log(`  اسم الأب: "${fatherName}"`);
      console.log(`  اسم الجد: "${grandName}"`);
      console.log(`  اسم العائلة: "${familyName}"`);
      
      const fullName = [firstName, fatherName, grandName, familyName]
        .filter(Boolean)
        .join(" ");
      
      console.log(`\n  ✅ الاسم المركب: "${fullName}"`);
    }
    
    console.log("\n\n" + "═".repeat(60));
    console.log("📊 إحصائيات:");
    console.log("═".repeat(60));
    console.log(`  • عدد الطلاب: ${data.length}`);
    console.log(`  • عدد الأعمدة: ${data.length > 0 ? Object.keys(data[0]).length : 0}`);
    
    console.log("\n✅ تم الانتهاء من التحليل\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

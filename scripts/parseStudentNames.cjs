const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

/**
 * تقسيم الاسم الكامل إلى أجزاء
 * مثال: "ادم محي الدين علي موسى" => 
 * { first: "ادم", father: "محي", grand: "الدين", family: "علي موسى" }
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { first: "", father: "", grand: "", family: "" };
  }
  
  const parts = fullName.trim().split(/\s+/);
  
  return {
    first: parts[0] || "",
    father: parts[1] || "",
    grand: parts[2] || "",
    family: parts.slice(3).join(" ") || ""
  };
}

(async () => {
  try {
    let filePath = path.resolve(__dirname, "../EL_StudentInfoReport.xls");
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     استخراج وتحليل أسماء الطلاب بشكل احترافي               ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    const workbook = XLSX.readFile(filePath);
    
    // معالجة كل ورقة
    workbook.SheetNames.forEach((sheetName, sheetIdx) => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      
      // البحث عن صفوف الطلاب (تحتوي على أسماء عربية)
      const students = [];
      
      data.forEach((row, rowIdx) => {
        // البحث عن الاسم الكامل في الصفوف
        Object.values(row).forEach(cell => {
          if (typeof cell === "string" && 
              cell.match(/[\u0600-\u06FF]/) && 
              cell.length > 5 &&
              !cell.includes(":") &&
              !cell.includes("الصف") &&
              !cell.includes("المرحلة")) {
            
            // تحقق من أن الخلية تحتوي على اسم (كلمات متعددة)
            const words = cell.trim().split(/\s+/);
            if (words.length >= 2 && words.length <= 6) {
              students.push({
                fullName: cell.trim(),
                parsed: parseFullName(cell.trim())
              });
            }
          }
        });
      });
      
      if (students.length > 0) {
        console.log(`\n📄 الورقة ${sheetIdx + 1}: "${sheetName}"`);
        console.log("═".repeat(60));
        console.log(`تم العثور على ${students.length} طالب/ة\n`);
        
        // عرض أول 5 طلاب
        console.log("📋 عينة من الطلاب (أول 5):\n");
        
        students.slice(0, 5).forEach((student, idx) => {
          console.log(`${idx + 1}. الاسم الكامل: "${student.fullName}"`);
          console.log(`   ├─ الاسم الأول: "${student.parsed.first}"`);
          console.log(`   ├─ اسم الأب: "${student.parsed.father}"`);
          console.log(`   ├─ اسم الجد: "${student.parsed.grand}"`);
          console.log(`   └─ اسم العائلة: "${student.parsed.family}"\n`);
        });
      }
    });
    
    console.log("\n" + "═".repeat(60));
    console.log("💡 الخلاصة:");
    console.log("═".repeat(60));
    console.log(`
طريقة استخراج الأسماء من ملف الطلبة:

1️⃣ قراءة الملف (EL_StudentInfoReport.xls)
2️⃣ البحث عن الأسماء الكاملة (نصوص عربية بـ 2-6 كلمات)
3️⃣ تقسيم الاسم الكامل إلى أجزاء:
   • الاسم الأول: الكلمة الأولى
   • اسم الأب: الكلمة الثانية
   • اسم الجد: الكلمة الثالثة
   • اسم العائلة: الكلمات المتبقية

مثال:
  الاسم الكامل: "ادم محي الدين علي موسى"
  ↓
  الاسم الأول: "ادم"
  اسم الأب: "محي"
  اسم الجد: "الدين"
  اسم العائلة: "علي موسى"
    `);
    
    console.log("\n✅ تم الانتهاء\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

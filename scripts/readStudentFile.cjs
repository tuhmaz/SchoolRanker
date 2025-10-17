const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

(async () => {
  try {
    let filePath = path.resolve(__dirname, "../EL_StudentInfoReport.xls");
    
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(__dirname, "../templates/EL_StudentInfoReport.xls");
    }
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     قراءة شاملة لملف الطلبة                                ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    const workbook = XLSX.readFile(filePath);
    
    console.log(`📊 إجمالي الأوراق: ${workbook.SheetNames.length}\n`);
    
    // قراءة كل ورقة
    workbook.SheetNames.forEach((sheetName, sheetIdx) => {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📄 الورقة ${sheetIdx + 1}: "${sheetName}"`);
      console.log(`${'═'.repeat(60)}\n`);
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      
      if (data.length === 0) {
        console.log("  (ورقة فارغة)\n");
        return;
      }
      
      // عرض رؤوس الأعمدة
      const headers = Object.keys(data[0]);
      console.log("📍 رؤوس الأعمدة:");
      headers.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h}`);
      });
      
      // عرض أول 3 صفوف
      console.log(`\n📊 عينة من البيانات (أول 3 صفوف من ${data.length}):\n`);
      
      data.slice(0, 3).forEach((row, idx) => {
        console.log(`  الصف ${idx + 1}:`);
        headers.forEach(h => {
          if (row[h]) {
            console.log(`    • ${h}: "${row[h]}"`);
          }
        });
        console.log("");
      });
    });
    
    console.log("\n✅ تم الانتهاء\n");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
})();

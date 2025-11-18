import ExcelJS from "exceljs";
import path from "path";

async function analyzeTemplate() {
  const templatePath = path.resolve("templates/alem_a.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  console.log("\n📊 TEMPLATE ANALYSIS FOR alem_a.xlsx\n");
  console.log(`Total worksheets: ${workbook.worksheets.length}`);

  workbook.worksheets.forEach((sheet, sheetIndex) => {
    console.log(`\n\n📄 Sheet ${sheetIndex + 1}: ${sheet.name}`);
    console.log(`   Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);

    // البحث عن أرقام المراجع في الأعمدة J و K
    console.log("\n   🔍 Reference numbers in columns J & K:");
    const refs: { row: number; colJ?: number; colK?: number }[] = [];

    for (let row = 1; row <= Math.min(sheet.rowCount, 1000); row++) {
      const cellJ = sheet.getCell(`J${row}`);
      const cellK = sheet.getCell(`K${row}`);

      const valueJ = cellJ.value ? parseFloat(cellJ.value.toString()) : null;
      const valueK = cellK.value ? parseFloat(cellK.value.toString()) : null;

      if (!isNaN(valueJ as any) && valueJ !== null) {
        refs.push({ row, colJ: valueJ as number });
      }
      if (!isNaN(valueK as any) && valueK !== null) {
        refs.push({ row, colK: valueK as number });
      }
    }

    if (refs.length > 0) {
      console.log(`   Found ${refs.length} references:`);
      refs.slice(0, 20).forEach(ref => {
        const display = ref.colJ !== undefined ? `J${ref.row}=${ref.colJ}` : `K${ref.row}=${ref.colK}`;
        console.log(`     Row ${ref.row}: ${display}`);
      });
      if (refs.length > 20) {
        console.log(`     ... and ${refs.length - 20} more`);
      }
    }

    // البحث عن أرقام الجداول في الصفوف الأولى
    console.log("\n   📋 First 50 rows content (columns A-O):");
    for (let row = 1; row <= Math.min(50, sheet.rowCount); row++) {
      let rowContent = "";
      for (let col = 1; col <= 15; col++) {
        const cell = sheet.getCell(row, col);
        const value = cell.value ? String(cell.value).substring(0, 10) : "";
        if (value) {
          rowContent += `${String.fromCharCode(64 + col)}:${value} | `;
        }
      }
      if (rowContent) {
        console.log(`     Row ${row}: ${rowContent}`);
      }
    }
  });
}

analyzeTemplate().catch(console.error);

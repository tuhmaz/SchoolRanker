const ExcelJS = require('exceljs');

async function checkPrintArea() {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('./templates/alem_b.xlsx');
    
    console.log('=== Template alem_b.xlsx Print Settings ===');
    
    wb.worksheets.forEach((sheet, index) => {
      console.log(`\nSheet ${index + 1}: ${sheet.name}`);
      
      if (sheet.pageSetup) {
        console.log('  Print Area:', sheet.pageSetup.printArea || 'Not set');
        console.log('  Print Titles Row:', sheet.pageSetup.printTitlesRow || 'Not set');
        console.log('  Print Titles Column:', sheet.pageSetup.printTitlesColumn || 'Not set');
        console.log('  Orientation:', sheet.pageSetup.orientation || 'Not set');
        console.log('  Scale:', sheet.pageSetup.scale || 'Not set');
      } else {
        console.log('  No pageSetup found');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPrintArea();
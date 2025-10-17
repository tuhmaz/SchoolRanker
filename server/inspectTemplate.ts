import ExcelJS from "exceljs";
import path from "path";

function toCellAddress(row: number, column: number): string {
  let col = column;
  let columnLabel = "";
  while (col > 0) {
    const remainder = (col - 1) % 26;
    columnLabel = String.fromCharCode(65 + remainder) + columnLabel;
    col = Math.floor((col - 1) / 26);
  }
  return `${columnLabel}${row}`;
}

async function main() {
  const templateName = process.argv[2] || "دفتر_العلامات_الرئيسي_النهائي (2).xlsx";
  const templatePath = path.resolve(process.cwd(), "templates", templateName);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  console.log(`Workbook ${templateName} contains ${workbook.worksheets.length} worksheets.`);
  workbook.worksheets.forEach((sheet, index) => {
    console.log(`\nSheet ${index + 1}: ${sheet.name}`);
    const maxColumns = sheet.actualColumnCount || sheet.columnCount;
    const maxRows = sheet.actualRowCount || sheet.rowCount;
    console.log(`  Dimensions: ${maxColumns} columns x ${maxRows} rows`);

    const populatedCells: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const value = cell.value;
        const formatted = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
        populatedCells.push(`${toCellAddress(rowNumber, colNumber)}=${formatted ?? ""}`);
      });
    });

    console.log(`  Total populated cells: ${populatedCells.length}`);
    const previewLimit = 200;
    populatedCells.slice(0, previewLimit).forEach((entry) => console.log(`    ${entry}`));
    if (populatedCells.length > previewLimit) {
      console.log(`    … (${populatedCells.length - previewLimit} more)`);
    }

    const merges = (sheet as any)?.model?.merges as string[] | undefined;
    if (merges?.length) {
      console.log(`  Merges (${merges.length} total)`);
      const mergePreviewLimit = 200;
      merges.slice(0, mergePreviewLimit).forEach((merge) => console.log(`    ${merge}`));
      if (merges.length > mergePreviewLimit) {
        console.log(`    … (${merges.length - mergePreviewLimit} more)`);
      }
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

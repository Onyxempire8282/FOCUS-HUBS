import fs from "fs";
import path from "path";
import XLSX from "xlsx";

console.clear();

console.log("=================================");
console.log("       FIND MY HUB");
console.log("     Hub Converter v0.1");
console.log("=================================\n");

// Workbook should live in the project root
const workbookPath = path.join(process.cwd(), "Update Hub List.xlsx");

if (!fs.existsSync(workbookPath)) {
    console.error("❌ Update Hub List.xlsx was not found.\n");
    console.log("Place the spreadsheet in the root of the project.");
    process.exit(1);
}

console.log("📄 Reading workbook...\n");

const workbook = XLSX.readFile(workbookPath);

console.log(`✅ Found ${workbook.SheetNames.length} worksheets.\n`);

console.log("Worksheets:");

workbook.SheetNames.forEach((sheet, index) => {
    console.log(`${index + 1}. ${sheet}`);
});

console.log("\nFinished.");
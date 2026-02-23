const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'dont-publish', 'Pegasys 2026 Responses.xlsx');
const workbook = XLSX.readFile(filePath);

const sheetName = workbook.SheetNames.find(n => n.includes('2026')) || workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const rowIndex = 2;
const startCol = 15;
const endCol = 34;

const row = data[rowIndex] || [];
const output = [];

for (let col = startCol; col <= endCol; col++) {
  const headerText = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : '';
  output.push({ columnIndex: col + 1, headerText });
}

const lines = output.map(o => `Column ${o.columnIndex}: ${o.headerText}`);
console.log('\n--- Row 3 headers, columns 16-35 ---\n');
lines.forEach(l => console.log(l));

const fs = require('fs');
const outPath = path.join(__dirname, 'temp-headers-output.txt');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('\n--- Output saved to temp-headers-output.txt ---');


import xlsx from 'xlsx';
import path from 'path';

async function debugHeader() {
  const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
  const sheet = workbook.Sheets['VENTAS'];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log('KEYS:', Object.keys(data[0]));
  process.exit(0);
}
debugHeader();

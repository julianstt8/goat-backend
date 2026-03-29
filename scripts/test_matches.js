import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';

async function run() {
  const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets['VENTAS']);
  
  const dbOrders = await Pedido.findAll({ attributes: ['id', 'tracking_number'] });
  console.log(`DB Orders Count: ${dbOrders.length}`);
  
  let matchCount = 0;
  for (const row of rows) {
    const t = String(row['TRACKING']).trim();
    const found = dbOrders.find(o => o.tracking_number && o.tracking_number === t);
    if (found) matchCount++;
  }
  console.log(`Potential Tracking Matches: ${matchCount}`);
  process.exit(0);
}
run();

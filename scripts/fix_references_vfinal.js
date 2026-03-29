import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';

async function finalFix() {
  console.log('--- Final Reference Restore ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets['VENTAS']);
    
    let count = 0;
    for (const row of rows) {
      const tracking = String(row['TRACKING'] || '').trim();
      const ref = String(row['Referencia'] || '').trim();
      if (!tracking || tracking === 'X' || !ref) continue;

      const pedido = await Pedido.findOne({ 
        where: { tracking_number: tracking }
      });

      if (pedido && pedido.producto_id) {
         await Producto.update({ referencia: ref }, { where: { id: pedido.producto_id } });
         count++;
      }
    }
    console.log(`Success: ${count} labels restored.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
finalFix();

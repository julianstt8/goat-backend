import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Op } from 'sequelize';

async function aggressiveFix() {
  console.log('--- AGGRESSIVE REF FIX (ESM) ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    
    let allRows = [];
    workbook.SheetNames.forEach(name => {
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[name]);
      allRows = allRows.concat(rows.map(r => ({ ...r, _sheet: name })));
    });

    const products = await Producto.findAll({ 
      where: { 
        referencia: { [Op.like]: 'REF-%' } 
      }
    });

    let fixedCount = 0;
    for (const prod of products) {
      const ped = await Pedido.findOne({ where: { producto_id: prod.id } });
      if (!ped) continue;

      const track = (ped.tracking_number || '').trim();
      const match = allRows.find(row => {
        return Object.values(row).some(v => String(v).includes(track) && track.length > 5);
      });

      if (match) {
         const finalRef = match['Referencia'] || match['PRODUCTO'] || match['Referencia '] || match['ITEM'];
         if (finalRef && String(finalRef).trim() !== 'undefined') {
            await prod.update({ referencia: String(finalRef).trim() });
            fixedCount++;
         }
      }
    }

    console.log(`- SUCCESS: ${fixedCount} extras restored.`);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
aggressiveFix();

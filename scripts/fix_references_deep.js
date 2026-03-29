import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Usuario } from '../src/database/models/usuario.model.js';

async function deepFix() {
  console.log('--- Deep Restore (Heuristic Match) ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets['VENTAS']);
    
    let count = 0;
    for (const row of rows) {
      const ref = String(row['Referencia'] || '').trim();
      const client = String(row['Cliente'] || '').trim();
      const price = row['Precio total'] || row['Precio total '] || 0;
      
      if (!ref || ref === 'undefined') continue;

      // Try fuzzy matching by client name and price
      const u = await Usuario.findOne({ where: { nombre_completo: client } });
      if (!u) continue;

      const p = await Pedido.findOne({ 
        where: { usuario_id: u.id, precio_venta_cop: price },
        include: [{ model: Producto, as: 'producto' }]
      });

      if (p && p.producto && (p.producto.referencia || '').startsWith('REF-')) {
         await Producto.update({ referencia: ref }, { where: { id: p.producto_id } });
         count++;
      }
    }
    console.log(`Deep Match Success: ${count} updated.`);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
deepFix();

import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Usuario } from '../src/database/models/usuario.model.js';

async function run() {
  console.log('--- Restore Ref Script (V3) ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const dataVentas = xlsx.utils.sheet_to_json(workbook.Sheets['VENTAS']);
    
    let count = 0;
    for (const row of dataVentas) {
      const tracking = String(row['TRACKING'] || row['TRACKING '] || '').trim();
      const refExcel = String(row['Referencia'] || row['Referencia '] || '').trim();
      const clienteNome = String(row['Cliente'] || row['Cliente '] || '').trim();
      const precioTotal = row['Precio total'] || row['Precio total '] || 0;

      if (!refExcel || refExcel === 'undefined') continue;

      let p = null;
      // Search by tracking
      if (tracking && tracking.length > 5) {
        p = await Pedido.findOne({ where: { tracking_number: tracking }, include: [{ model: Producto, as: 'producto' }] });
      }

      // If not, search by user + amount
      if (!p && clienteNome) {
        const u = await Usuario.findOne({ where: { nombre_completo: clienteNome } });
        if (u) {
           p = await Pedido.findOne({ 
             where: { usuario_id: u.id, precio_venta_cop: precioTotal },
             include: [{ model: Producto, as: 'producto' }]
           });
        }
      }

      if (p && p.producto) {
        await p.producto.update({ referencia: refExcel });
        count++;
      }
    }
    console.log(`Success: ${count} updated.`);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
run();

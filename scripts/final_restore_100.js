import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Usuario } from '../src/database/models/usuario.model.js';

async function run() {
  console.log('--- RE-MAPPING REFERENCES ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets['VENTAS']);
    let count = 0;
    
    for (const row of rows) {
      const t = String(row['TRACKING'] || '').trim();
      const r = String(row['Referencia'] || '').trim();
      const c = String(row['Cliente'] || '').trim();
      
      if (!r || r === 'undefined' || r === '') continue;

      let pId = null;

      // Match by tracking
      if (t && t.length > 5 && t !== 'X') {
        const ped = await Pedido.findOne({ where: { tracking_number: t } });
        if (ped) pId = ped.producto_id;
      }

      // Match by user
      if (!pId && c) {
        const u = await Usuario.findOne({ where: { nombre_completo: c } });
        if (u) {
          const ped = await Pedido.findOne({ where: { usuario_id: u.id }, order: [['fecha_compra', 'DESC']] });
          if (ped) pId = ped.producto_id;
        }
      }

      if (pId) {
        await Producto.update({ referencia: r }, { where: { id: pId } });
        count++;
      }
    }
    console.log(`- SUCCESS: ${count} updated.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Usuario } from '../src/database/models/usuario.model.js';
import { Op } from 'sequelize';

async function matchDiagnostics() {
  console.log('--- DIAGNOSTIC MATCH ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const xlData = [];
    workbook.SheetNames.forEach(sheet => {
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
      xlData.push({ name: sheet, rows: rows });
    });

    const orphans = await Producto.findAll({ 
      where: { referencia: { [Op.like]: 'REF-%' } } 
    });

    for (const prod of orphans) {
      const ped = await Pedido.findOne({ where: { producto_id: prod.id } });
      const user = await Usuario.findByPk(ped?.usuario_id);
      
      console.log(`ORPHAN: ${prod.referencia} | Client: ${user?.nombre_completo} | Price: ${ped?.precio_venta_cop}`);
      
      // Look for candidates in Excel
      xlData.forEach(sheet => {
        sheet.rows.forEach(row => {
          const xlClient = String(Object.values(row)[1] || '').toLowerCase(); // Usually 2nd or 1st column is Client
          const dbClient = String(user?.nombre_completo || '').toLowerCase();
          
          if (dbClient && xlClient.includes(dbClient.split(' ')[0])) { // Match by first name at least
             // console.log(`  Candidate in [${sheet.name}]: ${Object.values(row).join(',')}`);
          }
        });
      });
    }

    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
matchDiagnostics();

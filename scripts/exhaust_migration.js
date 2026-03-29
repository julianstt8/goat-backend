import xlsx from 'xlsx';
import path from 'path';
import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Usuario } from '../src/database/models/usuario.model.js';
import { Op } from 'sequelize';

async function ultraExhaust() {
  console.log('--- ULTRA EXHAUSTIVE RESTORE ---');
  try {
    const workbook = xlsx.readFile(path.join(process.cwd(), 'data', 'GOAT-SALES.xlsx'));
    const allData = [];
    workbook.SheetNames.forEach(sheet => {
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
      allData.push(...rows);
    });

    const orphans = await Producto.findAll({ 
      where: { referencia: { [Op.like]: 'REF-%' } } 
    });

    console.log(`Analyzing ${orphans.length} remaining products...`);

    let fixed = 0;
    for (const prod of orphans) {
      const ped = await Pedido.findOne({ where: { producto_id: prod.id } });
      const user = await Usuario.findByPk(ped?.usuario_id);
      
      const dbTracking = String(ped?.tracking_number || '').trim();
      const dbClient = String(user?.nombre_completo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      // Candidate search in all sheets
      const match = allData.find(row => {
        const rowString = JSON.stringify(row).toLowerCase();
        
        // 1. By tracking (even partial/scientific)
        if (dbTracking && dbTracking.length > 5 && rowString.includes(dbTracking.slice(-8).toLowerCase())) return true;
        
        // 2. By Client + first 8 of ID in Row
        if (dbClient && rowString.includes(dbClient.split(' ')[0]) && rowString.includes(prod.referencia.replace('REF-', '').toLowerCase())) return true;
        
        // 3. By Client + some price match
        const xlPrice = row['Precio total'] || row['Precio total '] || row['Precio total  '] || 0;
        const xlCost = row['Pagado nosotros'] || row['Costo'] || 0;
        if (dbClient && rowString.includes(dbClient.split(' ')[0])) {
           if (Math.abs(Number(xlPrice) - Number(ped?.precio_venta_cop)) < 500) return true;
           if (Math.abs(Number(xlCost) - Number(ped?.costo_total_usd)) < 0.1) return true;
        }

        return false;
      });

      if (match) {
        const ref = match['Referencia'] || match[' Referencia '] || match['ITEM'] || match['PRODUCTO'] || match['Referencia  '];
        if (ref && String(ref).trim() !== 'undefined') {
          await prod.update({ referencia: String(ref).trim() });
          fixed++;
        }
      }
    }

    console.log(`- Success: ${fixed} items restored.`);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
ultraExhaust();

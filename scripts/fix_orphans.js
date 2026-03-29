import { Pedido } from '../src/database/models/pedido.model.js';
import { Producto } from '../src/database/models/producto.model.js';
import { Categoria } from '../src/database/models/categoria.model.js';
import { sequelize } from '../src/database/sequelize.js';

async function run() {
  console.log('--- Iniciando Limpieza de Pedidos Huérfanos ---');
  
  try {
    // Buscar una categoría por defecto (ej: Otros o la primera que exista)
    let defaultCat = await Categoria.findOne({ where: { nombre: 'Otros' } });
    if (!defaultCat) defaultCat = await Categoria.findOne();
    const catId = defaultCat ? defaultCat.id : 1;

    const orphans = await Pedido.findAll({ where: { producto_id: null } });
    console.log(`Encontrados ${orphans.length} pedidos sin producto.`);

    for (const pedido of orphans) {
      console.log(`Procesando pedido: ${pedido.id}...`);
      
      // Crear un producto de respaldo para mantener la consistencia
      const prod = await Producto.create({
        referencia: `REF-${pedido.tracking_number ? pedido.tracking_number.slice(-8) : pedido.id.slice(0,8)}`,
        descripcion: `Producto migrado. Tracking: ${pedido.tracking_number || 'N/A'}`,
        categoria_id: catId,
        precio_compra_usd: pedido.costo_total_usd || 0,
        peso_libras: 1.0,
        talla: 'N/A',
        en_stock: false,
        vendido: true,
        fecha_creacion: pedido.fecha_compra || new Date()
      });

      // Vincular
      await pedido.update({ producto_id: prod.id });
    }

    console.log('--- Limpieza completada con éxito ---');
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

run();

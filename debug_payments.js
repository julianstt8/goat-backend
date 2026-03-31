import { sequelize } from './src/database/sequelize.js';
import { loadModels } from './src/database/bootstrap.js';

async function test() {
  const models = await loadModels();
  const { Pago, Pedido } = models;
  
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const payments = await Pago.findAll({
       include: [{
          model: Pedido,
          as: 'pedido',
          where: { usuario_id: userId },
          attributes: ['referencia', 'precio_venta_cop']
       }],
       order: [['fecha_pago', 'DESC']]
    });
    console.log('✅ OK');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.parent) console.error('Parent error:', err.parent.message);
  }
  await sequelize.close();
}

test();

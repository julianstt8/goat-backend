import { sequelize } from '../src/database/sequelize.js';

async function run() {
  try {
    await sequelize.query('ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;');
    console.log('✅ Columna "activo" añadida a la tabla "pedidos" correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error editando tabla:', err.message);
    process.exit(1);
  }
}

run();

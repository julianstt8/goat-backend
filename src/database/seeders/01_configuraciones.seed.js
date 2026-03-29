import { sequelize } from '../sequelize.js';
import { Configuracion } from '../models/configuracion.model.js';
import { syncViews } from '../views.js';

/**
 * Seeder: Configuraciones base del sistema (TRM, envíos, etc.)
 */
export async function up({ logger }) {
  // Crear vista de deudores (Sequelize no soporta views en sync)
  await syncViews();
  logger.log('✅ Vista vista_deudores sincronizada');

  // Datos iniciales de configuración
  const configs = [
    { nombre_variable: 'trm_offset',            valor: 200,  descripcion: 'Colchón de protección sobre TRM oficial (COP)' },
    { nombre_variable: 'fixed_shipping_usd',     valor: 16,   descripcion: 'Cargo fijo por envío internacional (USD)' },
    { nombre_variable: 'iva_percent',            valor: 0,    descripcion: 'Sin IVA por el momento' },
    { nombre_variable: 'shipping_lb_sneakers',   valor: 2.0,  descripcion: 'Precio por libra: calzado y ropa (USD)' },
    { nombre_variable: 'shipping_lb_perfume',    valor: 3.5,  descripcion: 'Precio por libra: líquidos y perfumes (USD)' },
  ];

  for (const config of configs) {
    await Configuracion.upsert(config);
  }
  logger.log(`✅ ${configs.length} configuraciones base insertadas`);
}

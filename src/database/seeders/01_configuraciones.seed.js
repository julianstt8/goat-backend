import { sequelize } from '../sequelize.js';
import { Configuracion } from '../models/configuracion.model.js';

/**
 * Seeder: Configuraciones base del sistema (TRM, envíos, etc.)
 */
export async function up({ logger }) {
  // Crear vista de deudores (Sequelize no soporta views en sync)
  await sequelize.query(`
    CREATE OR REPLACE VIEW vista_deudores AS
    SELECT
      p.id AS pedido_id,
      u.nombre_completo AS cliente,
      u.telefono,
      pr.referencia AS producto,
      p.precio_venta_cop,
      COALESCE(SUM(pg.monto_cop), 0) AS total_pagado,
      (p.precio_venta_cop - COALESCE(SUM(pg.monto_cop), 0)) AS saldo_restante,
      p.estado_logistico,
      p.fecha_compra
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN productos pr ON p.producto_id = pr.id
    LEFT JOIN pagos pg ON p.id = pg.pedido_id
    GROUP BY p.id, u.nombre_completo, u.telefono, pr.referencia;
  `);
  logger.log('✅ Vista vista_deudores creada');

  // Datos iniciales de configuración
  const configs = [
    { nombre_variable: 'trm_offset',            valor: 200,  descripcion: 'Colchón de protección sobre TRM oficial (COP)' },
    { nombre_variable: 'fixed_shipping_usd',     valor: 16,   descripcion: 'Cargo fijo por envío internacional (USD)' },
    { nombre_variable: 'iva_percent',            valor: 0.19, descripcion: 'IVA oficial Colombia' },
    { nombre_variable: 'shipping_lb_sneakers',   valor: 2.0,  descripcion: 'Precio por libra: calzado y ropa (USD)' },
    { nombre_variable: 'shipping_lb_perfume',    valor: 3.5,  descripcion: 'Precio por libra: líquidos y perfumes (USD)' },
  ];

  for (const config of configs) {
    await Configuracion.upsert(config);
  }
  logger.log(`✅ ${configs.length} configuraciones base insertadas`);
}

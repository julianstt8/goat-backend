import { sequelize } from './sequelize.js';

/**
 * Crea o actualiza las vistas SQL manuales que Sequelize no gestiona automáticamente.
 * Útil para reportes complejos como la vista de deudores.
 */
export async function syncViews() {
  console.log('👀 Sincronizando vistas personalizadas...');

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
      p.fecha_compra,
      p.creado_por,
      cur.rol AS creador_rol
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN productos pr ON p.producto_id = pr.id
    LEFT JOIN pagos pg ON p.id = pg.pedido_id
    LEFT JOIN usuarios cur ON p.creado_por = cur.id
    WHERE p.activo = true
    GROUP BY p.id, u.nombre_completo, u.telefono, pr.referencia, cur.rol
    HAVING (p.precio_venta_cop - COALESCE(SUM(pg.monto_cop), 0)) > 100
    ORDER BY p.fecha_compra DESC;
  `);

  console.log('✅ Vista vista_deudores actualizada');
}

/**
 * Elimina las vistas que pueden causar conflictos durante un 'alter' de tabla.
 */
export async function dropViews() {
  console.log('🗑️  Eliminando vistas temporales para permitir alteración de tablas...');
  await sequelize.query('DROP VIEW IF EXISTS vista_deudores;');
}

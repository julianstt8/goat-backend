import { sequelize } from '../database/sequelize.js';

/**
 * @openapi
 * tags:
 *   - name: Reportes
 *     description: Consultas a vistas personalizadas (Deudores, Ventas, etc)
 */

/**
 * @openapi
 * /reports/debtors:
 *   get:
 *     summary: Obtener lista de deudores (vista_deudores)
 *     description: Consulta la vista SQL que consolida saldos pendientes por cliente y pedido.
 *     tags: [Reportes]
 *     responses:
 *       200:
 *         description: Lista de deudores
 */
export async function getDebtors(req, res, next) {
  try {
    // Consultamos directamente la vista creada en src/database/views.js
    const [results] = await sequelize.query('SELECT * FROM vista_deudores ORDER BY fecha_compra DESC');
    res.json(results);
  } catch (err) {
    next(err);
  }
}

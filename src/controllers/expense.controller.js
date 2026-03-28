import { GastoOperativo } from '../database/models/gasto-operativo.model.js';
import { TIPO_ROL } from '../database/models/usuario.model.js';

/**
 * @openapi
 * /expenses:
 *   post:
 *     summary: Registrar un gasto operativo
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [descripcion, monto_cop]
 *             properties:
 *               descripcion:
 *                 type: string
 *                 example: "Pauta Instagram"
 *               monto_cop:
 *                 type: number
 *                 example: 150000
 *               categoria:
 *                 type: string
 *                 enum: [marketing, logistica, impuestos, operativo, personal]
 *                 default: operativo
 *               fecha_gasto:
 *                 type: string
 *                 format: date
 *                 example: "2025-03-27"
 *     responses:
 *       201:
 *         description: Gasto registrado
 */
export async function createExpense(req, res, next) {
  try {
    const { id: registradoPor } = req.user;
    const { descripcion, monto_cop, categoria, fecha_gasto } = req.body;

    if (!descripcion || !monto_cop) {
      return res.status(400).json({ message: 'descripcion y monto_cop son requeridos' });
    }

    const gasto = await GastoOperativo.create({
      descripcion,
      monto_cop,
      categoria: categoria ?? 'operativo',
      fecha_gasto: fecha_gasto ?? new Date(),
      registrado_por: registradoPor
    });

    res.status(201).json(gasto);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /expenses:
 *   get:
 *     summary: Listar gastos operativos
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: mes
 *         in: query
 *         schema:
 *           type: integer
 *         example: 3
 *       - name: anio
 *         in: query
 *         schema:
 *           type: integer
 *         example: 2025
 *     responses:
 *       200:
 *         description: Lista de gastos con total del período
 */
export async function listExpenses(req, res, next) {
  try {
    const { mes, anio } = req.query;
    const { sequelize } = await import('../database/sequelize.js');
    const { Op } = await import('sequelize');

    const where = {};
    if (mes && anio) {
      const inicio = new Date(Number(anio), Number(mes) - 1, 1);
      const fin = new Date(Number(anio), Number(mes), 0);
      where.fecha_gasto = { [Op.between]: [inicio, fin] };
    }

    const gastos = await GastoOperativo.findAll({ where, order: [['fecha_gasto', 'DESC']] });
    const totalCop = gastos.reduce((sum, g) => sum + Number(g.monto_cop), 0);

    res.json({ total_cop: totalCop, gastos });
  } catch (err) { next(err); }
}

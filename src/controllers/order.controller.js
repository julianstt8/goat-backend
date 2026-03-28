import { Pedido } from '../database/models/pedido.model.js';
import { Pago } from '../database/models/pago.model.js';
import { Usuario } from '../database/models/usuario.model.js';
import { Producto } from '../database/models/producto.model.js';
import { TIPO_ROL } from '../database/models/usuario.model.js';
import { sequelize } from '../database/sequelize.js';

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Lista de pedidos
 *     description: Super admin y vendedores ven todos. Clientes solo ven los suyos.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos con saldo calculado
 */
export async function listOrders(req, res, next) {
  try {
    const { id: userId, rol } = req.user;
    const isAdmin = [TIPO_ROL.SUPER_ADMIN, TIPO_ROL.VENDEDOR].includes(rol);

    const where = isAdmin ? {} : { usuario_id: userId };

    const pedidos = await Pedido.findAll({
      where,
      include: [
        { model: Usuario, as: 'cliente', attributes: ['id', 'nombre_completo', 'email'] },
        { model: Producto, as: 'producto', attributes: ['id', 'referencia', 'talla'] },
        { model: Pago, as: 'pagos', attributes: ['id', 'monto_cop', 'tipo_abono', 'fecha_pago'] }
      ],
      order: [['fecha_compra', 'DESC']]
    });

    // Añadir saldo calculado a cada pedido
    const result = pedidos.map(p => {
      const plain = p.get({ plain: true });
      const totalPagado = plain.pagos.reduce((sum, pg) => sum + Number(pg.monto_cop), 0);
      return {
        ...plain,
        total_pagado: totalPagado,
        saldo_restante: Number(plain.precio_venta_cop) - totalPagado
      };
    });

    res.json(result);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders/{id}/balance:
 *   get:
 *     summary: Saldo de un pedido
 *     description: Calcula el restante de cartera de un pedido específico.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Desglose de cartera del pedido
 *       404:
 *         description: Pedido no encontrado
 */
export async function getOrderBalance(req, res, next) {
  try {
    const { id } = req.params;
    const { id: userId, rol } = req.user;
    const isAdmin = [TIPO_ROL.SUPER_ADMIN, TIPO_ROL.VENDEDOR].includes(rol);

    const pedido = await Pedido.findByPk(id, {
      include: [
        { model: Usuario, as: 'cliente', attributes: ['id', 'nombre_completo', 'telefono'] },
        { model: Pago, as: 'pagos', order: [['fecha_pago', 'ASC']] }
      ]
    });

    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    // Clientes solo pueden ver sus propios pedidos
    if (!isAdmin && pedido.usuario_id !== userId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const pagos = pedido.pagos ?? [];
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto_cop), 0);
    const saldoRestante = Number(pedido.precio_venta_cop) - totalPagado;

    res.json({
      pedido_id: pedido.id,
      cliente: pedido.cliente,
      precio_venta_cop: Number(pedido.precio_venta_cop),
      total_pagado: totalPagado,
      saldo_restante: saldoRestante,
      estado_pago: saldoRestante <= 0 ? 'completado' : totalPagado > 0 ? 'parcial' : 'pendiente',
      estado_logistico: pedido.estado_logistico,
      abonos: pagos.map(p => ({
        id: p.id,
        tipo_abono: p.tipo_abono,
        monto_cop: Number(p.monto_cop),
        fecha_pago: p.fecha_pago
      }))
    });
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Crear un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 */
export async function createOrder(req, res, next) {
  try {
    const { id: creadoPor } = req.user;
    const {
      usuario_id, producto_id, referencia, tracking_number,
      precio_venta_cop, trm_utilizada, costo_total_usd,
      fecha_compra, estado_logistico
    } = req.body;

    if (!usuario_id || !precio_venta_cop || !trm_utilizada) {
      return res.status(400).json({ message: 'usuario_id, precio_venta_cop y trm_utilizada son requeridos' });
    }

    // Si se vincula un producto, marcarlo como vendido
    if (producto_id) {
      await Producto.update({ vendido: true }, { where: { id: producto_id } });
    }

    const pedido = await Pedido.create({
      usuario_id,
      producto_id: producto_id ?? null,
      tracking_number: tracking_number ?? null,
      estado_logistico: estado_logistico ?? 'pendiente',
      precio_venta_cop,
      trm_utilizada,
      costo_total_usd: costo_total_usd ?? null,
      fecha_compra: fecha_compra ?? new Date(),
      creado_por: creadoPor
    });

    res.status(201).json(pedido);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders/{id}:
 *   patch:
 *     summary: Actualizar estado logístico de un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { id: modificadoPor } = req.user;
    const { estado_logistico, tracking_number, fecha_entrega_real } = req.body;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    await pedido.update({
      ...(estado_logistico && { estado_logistico }),
      ...(tracking_number && { tracking_number }),
      ...(fecha_entrega_real && { fecha_entrega_real }),
      modificado_por: modificadoPor
    });

    res.json(pedido);
  } catch (err) { next(err); }
}

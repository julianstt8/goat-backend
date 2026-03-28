import { Pago } from '../database/models/pago.model.js';
import { Pedido } from '../database/models/pedido.model.js';

/**
 * @openapi
 * /orders/{id}/payments:
 *   get:
 *     summary: Listar abonos de un pedido
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de pagos con total abonado y saldo restante
 */
export async function listPayments(req, res, next) {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    const pagos = await Pago.findAll({
      where: { pedido_id: id },
      order: [['fecha_pago', 'ASC']]
    });

    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto_cop), 0);

    res.json({
      pedido_id: id,
      precio_venta_cop: Number(pedido.precio_venta_cop),
      total_pagado: totalPagado,
      saldo_restante: Number(pedido.precio_venta_cop) - totalPagado,
      estado_pago: totalPagado >= Number(pedido.precio_venta_cop) ? 'completado'
        : totalPagado > 0 ? 'parcial' : 'pendiente',
      pagos
    });
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders/{id}/payments:
 *   post:
 *     summary: Registrar un abono a un pedido
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [monto_cop]
 *             properties:
 *               monto_cop: { type: number, example: 500000 }
 *               metodo_pago: { type: string, example: "Nequi" }
 *               tipo_abono: { type: string, example: "Anticipo" }
 *               comprobante_url: { type: string, format: uri }
 *               fecha_pago: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Pago registrado con saldo actualizado
 *       400:
 *         description: Monto supera el saldo restante
 */
export async function createPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { monto_cop, metodo_pago, tipo_abono, comprobante_url, fecha_pago } = req.body;

    if (!monto_cop || isNaN(Number(monto_cop))) {
      return res.status(400).json({ message: 'monto_cop es requerido' });
    }

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    // Validar que no se sobrepague
    const pagosAnteriores = await Pago.findAll({ where: { pedido_id: id } });
    const totalPrevio = pagosAnteriores.reduce((sum, p) => sum + Number(p.monto_cop), 0);
    const saldoRestante = Number(pedido.precio_venta_cop) - totalPrevio;

    if (Number(monto_cop) > saldoRestante + 0.01) {
      return res.status(400).json({
        message: 'El monto supera el saldo restante',
        saldo_restante: saldoRestante
      });
    }

    const pago = await Pago.create({
      pedido_id: id,
      monto_cop: Number(monto_cop),
      metodo_pago: metodo_pago ?? null,
      tipo_abono: tipo_abono ?? null,
      comprobante_url: comprobante_url ?? null,
      fecha_pago: fecha_pago ? new Date(fecha_pago) : new Date()
    });

    const nuevoTotal = totalPrevio + Number(monto_cop);
    const nuevoSaldo = Number(pedido.precio_venta_cop) - nuevoTotal;

    res.status(201).json({
      pago,
      resumen: {
        precio_venta_cop: Number(pedido.precio_venta_cop),
        total_pagado: nuevoTotal,
        saldo_restante: nuevoSaldo,
        estado_pago: nuevoSaldo <= 0 ? 'completado' : 'parcial'
      }
    });
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders/{orderId}/payments/{paymentId}:
 *   delete:
 *     summary: Eliminar un pago
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 */
export async function deletePayment(req, res, next) {
  try {
    const { paymentId } = req.params;
    const pago = await Pago.findByPk(paymentId);
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado' });
    await pago.destroy();
    res.json({ message: 'Pago eliminado', id: paymentId });
  } catch (err) { next(err); }
}

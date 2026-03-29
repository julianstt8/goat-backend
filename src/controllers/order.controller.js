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
      usuario_id, producto_id, tracking_number,
      precio_venta_cop, trm_utilizada, costo_total_usd,
      fecha_compra, estado_logistico,
      // Product details if it's a new one
      referencia, categoria_id, talla, precio_compra_usd, peso_libras
    } = req.body;

    if (!usuario_id || !precio_venta_cop || !trm_utilizada) {
      return res.status(400).json({ message: 'usuario_id, precio_venta_cop y trm_utilizada son requeridos' });
    }

    let linkedProductId = producto_id;

    // If no product ID is provided, it's a custom order. Create the product entry.
    if (!linkedProductId && referencia) {
      const prod = await Producto.create({
        referencia,
        categoria_id,
        talla: talla ?? 'N/A',
        precio_compra_usd: precio_compra_usd ?? (costo_total_usd || 0),
        peso_libras: peso_libras ?? 1.0,
        vendido: true // Mark as sold immediately
      });
      linkedProductId = prod.id;
    } else if (linkedProductId) {
      await Producto.update({ vendido: true }, { where: { id: linkedProductId } });
    }

    const pedido = await Pedido.create({
      usuario_id,
      producto_id: linkedProductId,
      tracking_number: tracking_number ?? null,
      estado_logistico: estado_logistico ?? 'pendiente',
      precio_venta_cop,
      trm_utilizada,
      costo_total_usd: costo_total_usd ?? null,
      fecha_compra: fecha_compra ?? null,
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
    const { usuario_id, estado_logistico, tracking_number, fecha_entrega_real, fecha_compra, referencia } = req.body;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    // Si se envía una nueva referencia y el pedido tiene un producto vinculado, lo actualizamos
    if (referencia && pedido.producto_id) {
      await Producto.update({ referencia }, { where: { id: pedido.producto_id } });
    }

    await pedido.update({
      ...(usuario_id && { usuario_id }),
      ...(estado_logistico && { estado_logistico }),
      ...(tracking_number && { tracking_number }),
      ...(fecha_entrega_real && { fecha_entrega_real }),
      ...(fecha_compra && { fecha_compra }),
      modificado_por: modificadoPor
    });

    res.json(pedido);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     summary: Eliminar un pedido definitivamente
 *     description: Elimina el registro del pedido y sus abonos. Si tenía un producto vinculado, el producto vuelve a estar disponible (vendido = false).
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 */
export async function deleteOrder(req, res, next) {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id);
    
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Si tiene un producto vinculado, lo devolvemos al stock
    if (pedido.producto_id) {
       await Producto.update({ vendido: false }, { where: { id: pedido.producto_id } });
    }

    // Los abonos se eliminan por CASCADE en la base de datos si está configurado, 
    // si no, los eliminamos manualmente aquí (mejor ser explícito por seguridad)
    // Pero asumiendo nuestra arquitectura, el pedido es el core.
    await pedido.destroy();

    res.json({ message: 'Pedido eliminado con éxito', id });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /orders/batch:
 *   post:
 *     summary: Crear múltiples pedidos desde una cotización (Batch)
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 */
export async function createBatchOrder(req, res, next) {
   const t = await sequelize.transaction();
   try {
      const { id: creadoPor } = req.user;
      const { items, cliente, trm_used } = req.body;

      if (!items || !cliente || !trm_used) {
         return res.status(400).json({ message: 'items, cliente y trm_used son requeridos' });
      }

      // 1. Resolver Cliente (Usuario)
      let usuarioId = cliente.id;
      if (!usuarioId) {
         // Buscar por email si no tiene ID
         const u = await Usuario.findOne({ where: { email: cliente.email.toLowerCase() }, transaction: t });
         if (u) {
            usuarioId = u.id;
         } else {
            // Crear nuevo cliente
            const nuevoUser = await Usuario.create({
               nombre_completo: cliente.nombre,
               email: cliente.email.toLowerCase(),
               telefono: cliente.telefono || null,
               rol: TIPO_ROL.CLIENTE_STANDARD,
               nivel: 'bronze',
               activo: true
            }, { transaction: t });
            usuarioId = nuevoUser.id;
         }
      }

      const createdOrders = [];

      // 2. Procesar cada ítem
      for (const item of items) {
         // Crear Producto (siempre nuevo ítem para cotización externa)
         const prod = await Producto.create({
            referencia: item.referencia,
            categoria_id: item.categoria_id || null, // Se asume null si no se envió
            talla: 'N/A', // O extraer si se envía en el objeto ítem
            precio_compra_usd: item.precioCompraUsd,
            peso_libras: item.pesoLibras || 1.0,
            vendido: true
         }, { transaction: t });

         // Calcular precio venta basado en el margen (repetir lógica del frontend por integridad)
         // O mejor, recibir el precio calculado desde el frontend
         const logistica_fija_usd = 20; // Default
         const baseCompraCop = item.precioCompraUsd * trm_used;
         const logisticaCop = logistica_fija_usd * trm_used;
         const pesoCop = (Number(item.pesoLibras) * 2.5) * trm_used;
         const totalCostCop = baseCompraCop + logisticaCop + pesoCop;
         const precioVentaFinal = Math.ceil((totalCostCop / 0.85) / 1000) * 1000;

         // Crear Pedido
         const pedido = await Pedido.create({
            usuario_id: usuarioId,
            producto_id: prod.id,
            estado_logistico: 'pendiente',
            precio_venta_cop: precioVentaFinal,
            trm_utilizada: trm_used,
            costo_total_usd: item.precioCompraUsd,
            creado_por: creadoPor,
            fecha_compra: new Date()
         }, { transaction: t });

         createdOrders.push(pedido);
      }

      await t.commit();
      res.status(201).json({ 
         message: `¡${createdOrders.length} pedidos registrados con éxito!`, 
         cliente_id: usuarioId,
         pedidos: createdOrders 
      });

   } catch (err) {
      await t.rollback();
      next(err);
   }
}

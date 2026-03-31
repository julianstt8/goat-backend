import { Usuario, NIVEL_HYPE } from '../database/models/usuario.model.js';
import { DireccionUsuario } from '../database/models/direccion-usuario.model.js';
import { Wishlist } from '../database/models/wishlist.model.js';
import { Pedido } from '../database/models/pedido.model.js';
import { Pago } from '../database/models/pago.model.js';
import { Producto } from '../database/models/producto.model.js';

/**
 * Obtener perfil completo con nivel, tallas y estadísticas
 */
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await Usuario.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });
    
    // Estadísticas rápidas
    const orderCount = await Pedido.count({ where: { usuario_id: userId } });
    
    res.json({
       ...user.get({ plain: true }),
       stats: {
          total_pedidos: orderCount
       }
    });
  } catch (err) { next(err); }
}

/**
 * Actualizar datos básicos y tallas
 */
export async function updateProfile(req, res, next) {
  try {
    const { nombre_completo, telefono, talla_calzado_us, talla_ropa } = req.body;
    const user = await Usuario.findByPk(req.user.id);
    
    await user.update({
       nombre_completo: nombre_completo ?? user.nombre_completo,
       telefono: telefono ?? user.telefono,
       talla_calzado_us: talla_calzado_us ?? user.talla_calzado_us,
       talla_ropa: talla_ropa ?? user.talla_ropa
    });
    
    res.json(user);
  } catch (err) { next(err); }
}

/**
 * Direcciones
 */
export async function listAddresses(req, res, next) {
  try {
    const list = await DireccionUsuario.findAll({ where: { usuario_id: req.user.id } });
    res.json(list);
  } catch (err) { next(err); }
}

export async function addAddress(req, res, next) {
  try {
    const { ciudad, direccion_completa, indicaciones_entrega, es_principal } = req.body;
    
    if (es_principal) {
       await DireccionUsuario.update({ es_principal: false }, { where: { usuario_id: req.user.id } });
    }
    
    const addr = await DireccionUsuario.create({
       usuario_id: req.user.id,
       ciudad, direccion_completa, indicaciones_entrega, es_principal
    });
    res.status(201).json(addr);
  } catch (err) { next(err); }
}

export async function deleteAddress(req, res, next) {
  try {
    const addr = await DireccionUsuario.findOne({ where: { id: req.params.id, usuario_id: req.user.id } });
    if (!addr) return res.status(404).json({ message: 'Dirección no encontrada' });
    await addr.destroy();
    res.json({ message: 'Dirección eliminada' });
  } catch (err) { next(err); }
}

/**
 * Wishlist
 */
export async function listWishlist(req, res, next) {
  try {
    const list = await Wishlist.findAll({ where: { usuario_id: req.user.id } });
    
    // Opcional: hidratar con datos de productos si existen en Stock
    // Por ahora solo devolvemos las referencias
    res.json(list);
  } catch (err) { next(err); }
}

export async function addToWishlist(req, res, next) {
  try {
    const { referencia } = req.body;
    const [item, created] = await Wishlist.findOrCreate({
       where: { usuario_id: req.user.id, referencia }
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function removeFromWishlist(req, res, next) {
  try {
    await Wishlist.destroy({ where: { id: req.params.id, usuario_id: req.user.id } });
    res.json({ message: 'Eliminado de wishlist' });
  } catch (err) { next(err); }
}

/**
 * Historial de Pagos completo
 */
export async function listPayments(req, res, next) {
  try {
    const payments = await Pago.findAll({
       include: [{
          model: Pedido,
          as: 'pedido',
          where: { usuario_id: req.user.id },
          attributes: ['precio_venta_cop'],
          include: [{
             model: Producto,
             as: 'producto',
             attributes: ['referencia']
          }]
       }],
       order: [['fecha_pago', 'DESC']]
    });
    res.json(payments);
  } catch (err) { next(err); }
}

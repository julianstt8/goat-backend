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
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: DireccionUsuario,
        as: 'direcciones',
        required: false
      }]
    });
    
    // Estadísticas e Inversión Total
    const userOrders = await Pedido.findAll({ 
       where: { usuario_id: userId, activo: true },
       attributes: ['precio_venta_cop', 'estado_logistico']
    });

    const totalInversion = userOrders.reduce((acc, o) => acc + Number(o.precio_venta_cop), 0);
    const completedOrders = userOrders.filter(o => o.estado_logistico === 'entregado').length;

    // Lógica de Niveles
    let calculadoNivel = NIVEL_HYPE.BRONZE;
    let proximoNivel = NIVEL_HYPE.SILVER;
    let metaPesos = 1000000;
    let metaPedidos = 2;

    if (totalInversion >= 5000000 || completedOrders >= 10) {
      calculadoNivel = NIVEL_HYPE.DIAMOND;
      proximoNivel = null;
    } else if (totalInversion >= 2500000 || completedOrders >= 5) {
      calculadoNivel = NIVEL_HYPE.GOLD;
      proximoNivel = NIVEL_HYPE.DIAMOND;
      metaPesos = 5000000;
      metaPedidos = 10;
    } else if (totalInversion >= 1000000 || completedOrders >= 2) {
      calculadoNivel = NIVEL_HYPE.SILVER;
      proximoNivel = NIVEL_HYPE.GOLD;
      metaPesos = 2500000;
      metaPedidos = 5;
    }

    // Auto-update nivel si el calculado es superior
    if (calculadoNivel !== user.nivel) {
       await user.update({ nivel: calculadoNivel });
    }

    // Calcular % de avance hacia el siguiente nivel
    let pctAvance = 100;
    if (proximoNivel) {
       const pctPesos = Math.min((totalInversion / metaPesos) * 100, 100);
       const pctPedidos = Math.min((completedOrders / metaPedidos) * 100, 100);
       pctAvance = Math.round(Math.max(pctPesos, pctPedidos));
    }
    
    // Buscar la principal o la última registrada
    const allAddrs = user.direcciones || [];
    const primaryAddr = allAddrs.find(a => a.es_principal) || allAddrs[allAddrs.length - 1];
    
    res.json({
       ...user.get({ plain: true }),
       nivel: calculadoNivel, // Asegurar que devolvemos el actualizado
       ciudad: primaryAddr?.ciudad || null,
       direccion: primaryAddr?.direccion_completa || null,
       proximo_nivel: proximoNivel,
       porcentaje_avance: pctAvance,
       stats: {
          total_pedidos: userOrders.length,
          pedidos_completados: completedOrders,
          inversion_total: totalInversion
       }
    });
  } catch (err) { next(err); }
}

/**
 * Actualizar datos básicos y tallas
 */
export async function updateProfile(req, res, next) {
  try {
    const { nombre_completo, telefono, talla_calzado_us, talla_ropa, genero } = req.body;
    const user = await Usuario.findByPk(req.user.id);
    
    let finalGenero = genero ?? user.genero;
    
    // Si la talla de calzado incluye el separador '/', se asume Unisex por defecto (M/W)
    if (talla_calzado_us?.includes('/')) {
       finalGenero = 'unisex';
    }

    await user.update({
       nombre_completo: nombre_completo ?? user.nombre_completo,
       telefono: telefono ?? user.telefono,
       talla_calzado_us: talla_calzado_us ?? user.talla_calzado_us,
       talla_ropa: talla_ropa ?? user.talla_ropa,
       genero: finalGenero
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

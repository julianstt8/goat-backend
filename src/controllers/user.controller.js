import { Op } from 'sequelize';
import { Usuario, TIPO_ROL } from '../database/models/usuario.model.js';
import { DireccionUsuario } from '../database/models/direccion-usuario.model.js';
import { hashPassword } from '../utils/crypto.util.js';

function omitHash(plain) {
  const { password_hash, ...rest } = plain;
  return rest;
}

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Listar usuarios
 *     description: Super admin ve todos. Vendedor ve solo clientes. Cliente ve solo su perfil.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: rol
 *         in: query
 *         schema:
 *           type: string
 *           enum: [super_admin, vendedor, cliente_vip, cliente_standard]
 *       - name: activo
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: q
 *         in: query
 *         description: Buscar por nombre o email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
export async function listUsers(req, res, next) {
  try {
    const { rol: myRol, id: myId } = req.user;
    const { rol, activo, q } = req.query;

    // Clientes solo ven su propio perfil
    if (myRol === TIPO_ROL.CLIENTE_VIP || myRol === TIPO_ROL.CLIENTE_STANDARD) {
      const me = await Usuario.findByPk(myId, { include: [{ model: DireccionUsuario, as: 'direcciones' }] });
      return res.json([omitHash(me.get({ plain: true }))]);
    }

    const where = {};
    // Vendedores solo ven clientes
    if (myRol === TIPO_ROL.VENDEDOR) {
      where.rol = { [Op.in]: [TIPO_ROL.CLIENTE_VIP, TIPO_ROL.CLIENTE_STANDARD] };
    } else if (rol) {
      where.rol = rol;
    }
    if (activo !== undefined) where.activo = activo === 'true';
    if (q) {
      where[Op.or] = [
        { nombre_completo: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const users = await Usuario.findAll({
      where,
      include: [{ model: DireccionUsuario, as: 'direcciones' }],
      order: [['fecha_registro', 'DESC']],
      attributes: { exclude: ['password_hash'] }
    });

    console.log(`[DEBUG] listUsers: myRol=${myRol}, found=${users.length}`);
    res.json(users);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Datos del usuario
 *       404:
 *         description: Usuario no encontrado
 */
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const { id: myId, rol } = req.user;
    const isAdmin = [TIPO_ROL.SUPER_ADMIN, TIPO_ROL.VENDEDOR].includes(rol);

    if (!isAdmin && myId !== id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const user = await Usuario.findByPk(id, {
      include: [{ model: DireccionUsuario, as: 'direcciones' }],
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json(user);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Crear usuario (cliente sin acceso a plataforma o con password)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, email]
 *             properties:
 *               nombre_completo: { type: string, example: "María García" }
 *               email: { type: string, format: email }
 *               telefono: { type: string, example: "+573001234567" }
 *               password: { type: string, description: "Omitir para crear cliente sin acceso" }
 *               rol: { type: string, enum: [super_admin, vendedor, cliente_vip, cliente_standard] }
 *               nivel: { type: string, enum: [bronze, silver, gold, diamond] }
 *     responses:
 *       201:
 *         description: Usuario creado
 *       409:
 *         description: Email ya registrado
 */
export async function createUser(req, res, next) {
  try {
    const { nombre_completo, email, telefono, password, rol, nivel } = req.body;
    if (!nombre_completo || !email) {
      return res.status(400).json({ message: 'nombre_completo y email son requeridos' });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(409).json({ message: 'Email ya registrado' });

    const password_hash = password ? await hashPassword(password) : null;

    const user = await Usuario.create({
      nombre_completo, email, telefono: telefono ?? null,
      password_hash,
      rol: rol ?? TIPO_ROL.CLIENTE_STANDARD,
      nivel: nivel ?? 'bronze'
    });

    res.status(201).json(omitHash(user.get({ plain: true })));
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Actualizar datos de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { id: myId, rol } = req.user;
    const isAdmin = rol === TIPO_ROL.SUPER_ADMIN;

    const user = await Usuario.findByPk(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (!isAdmin && myId !== id) return res.status(403).json({ message: 'No autorizado' });

    const data = { ...req.body };

    // No-admins no pueden cambiar rol, nivel ni activo
    if (!isAdmin) {
      delete data.rol; delete data.nivel; delete data.activo;
    }

    // Hash de contraseña si se envía
    if (data.password) {
      data.password_hash = await hashPassword(data.password);
      delete data.password;
    }

    // Email único
    if (data.email && data.email !== user.email) {
      const dup = await Usuario.findOne({ where: { email: data.email, id: { [Op.ne]: id } } });
      if (dup) return res.status(409).json({ message: 'Email ya en uso' });
    }

    await user.update(data);
    res.json(omitHash(user.get({ plain: true })));
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Desactivar un usuario (soft delete)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
export async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await Usuario.findByPk(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    await user.update({ activo: false });
    res.json({ message: 'Usuario desactivado', id });
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /users/{id}/addresses:
 *   post:
 *     summary: Agregar dirección de entrega a un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
export async function addAddress(req, res, next) {
  try {
    const { id } = req.params;
    const { ciudad, direccion_completa, indicaciones_entrega, es_principal } = req.body;

    if (!direccion_completa) return res.status(400).json({ message: 'direccion_completa es requerido' });

    // Si es principal, quitar la anterior
    if (es_principal) {
      await DireccionUsuario.update({ es_principal: false }, { where: { usuario_id: id } });
    }

    const dir = await DireccionUsuario.create({
      usuario_id: id, ciudad: ciudad ?? 'Medellín',
      direccion_completa, indicaciones_entrega, es_principal: es_principal ?? false
    });

    res.status(201).json(dir);
  } catch (err) { next(err); }
}

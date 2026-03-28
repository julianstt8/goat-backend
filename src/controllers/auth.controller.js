import { Usuario, TIPO_ROL } from '../database/models/usuario.model.js';
import { verifyPassword, hashPassword } from '../utils/crypto.util.js';
import { signJwt } from '../utils/jwt.util.js';

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@goat.com
 *               password:
 *                 type: string
 *                 example: "12345678"
 *     responses:
 *       200:
 *         description: Token JWT generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Campos requeridos faltantes
 *       401:
 *         description: Credenciales inválidas
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email y password son requeridos' });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    // usuario existe pero no tiene activo el acceso
    if (!usuario.activo) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    if (!usuario.password_hash) {
      return res.status(403).json({ message: 'Este usuario no tiene acceso a la plataforma' });
    }

    const ok = await verifyPassword(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = signJwt({
      id: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre_completo,
      email: usuario.email
    });

    res.json({ token });
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Habilitar acceso a la plataforma para un usuario existente o crear uno nuevo con acceso
 *     description: |
 *       Un usuario puede existir en el sistema solo para control de ventas (sin password).
 *       Este endpoint crea un usuario con acceso activo a la plataforma.
 *       Si el email ya existe pero sin password, se puede usar PATCH /usuarios/:id para asignarle uno.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_completo, email, password]
 *             properties:
 *               nombre_completo:
 *                 type: string
 *                 example: "Juan Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@goat.com
 *               password:
 *                 type: string
 *                 example: "12345678"
 *               telefono:
 *                 type: string
 *                 example: "+573001234567"
 *               rol:
 *                 type: string
 *                 enum: [admin, cliente]
 *                 default: cliente
 *     responses:
 *       201:
 *         description: Usuario creado con acceso a la plataforma
 *       409:
 *         description: Email ya registrado
 */
export async function register(req, res, next) {
  try {
    const { nombre_completo, email, password, telefono, rol } = req.body;
    if (!nombre_completo || !email || !password) {
      return res.status(400).json({ message: 'nombre_completo, email y password son requeridos' });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(409).json({ message: 'Email ya registrado' });
    }

    const password_hash = await hashPassword(password);
    const usuario = await Usuario.create({
      nombre_completo,
      email,
      password_hash,
      telefono: telefono ?? null,
      rol: rol ?? TIPO_ROL.CLIENTE_STANDARD
    });

    const plain = usuario.get({ plain: true });
    delete plain.password_hash;

    res.status(201).json(plain);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Obtener el usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *       401:
 *         description: Token inválido o ausente
 */
export async function me(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { next(err); }
}

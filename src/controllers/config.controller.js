import { Configuracion } from '../database/models/configuracion.model.js';

/**
 * @openapi
 * /config:
 *   get:
 *     summary: Listar todas las configuraciones del sistema
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de variables de configuración (TRM offset, envíos, IVA, etc.)
 */
export async function listConfig(req, res, next) {
  try {
    const configs = await Configuracion.findAll({ order: [['nombre_variable', 'ASC']] });
    res.json(configs);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /config/{nombre_variable}:
 *   put:
 *     summary: Actualizar valor de una configuración
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: nombre_variable
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         example: trm_offset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [valor]
 *             properties:
 *               valor: { type: number, example: 250 }
 *               descripcion: { type: string }
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       404:
 *         description: Variable no encontrada
 */
export async function updateConfig(req, res, next) {
  try {
    const { nombre_variable } = req.params;
    const { valor, descripcion } = req.body;

    if (valor === undefined || isNaN(Number(valor))) {
      return res.status(400).json({ message: 'valor numérico es requerido' });
    }

    const config = await Configuracion.findOne({ where: { nombre_variable } });
    if (!config) return res.status(404).json({ message: `Variable '${nombre_variable}' no encontrada` });

    await config.update({
      valor: Number(valor),
      ...(descripcion && { descripcion }),
      ultima_actualizacion: new Date()
    });

    res.json(config);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /config:
 *   post:
 *     summary: Crear nueva variable de configuración
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 */
export async function createConfig(req, res, next) {
  try {
    const { nombre_variable, valor, descripcion } = req.body;
    if (!nombre_variable || valor === undefined) {
      return res.status(400).json({ message: 'nombre_variable y valor son requeridos' });
    }

    const [config, created] = await Configuracion.findOrCreate({
      where: { nombre_variable },
      defaults: { valor: Number(valor), descripcion: descripcion ?? null }
    });

    if (!created) return res.status(409).json({ message: 'Variable ya existe. Use PUT para actualizar.' });
    res.status(201).json(config);
  } catch (err) { next(err); }
}

import { Producto } from '../database/models/producto.model.js';
import { Categoria } from '../database/models/categoria.model.js';
import { Op } from 'sequelize';

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar productos
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: en_stock
 *         in: query
 *         schema: { type: boolean }
 *       - name: vendido
 *         in: query
 *         schema: { type: boolean }
 *       - name: categoria_id
 *         in: query
 *         schema: { type: integer }
 *       - name: q
 *         in: query
 *         description: Buscar por referencia
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de productos
 */
export async function listProducts(req, res, next) {
  try {
    const { en_stock, vendido, categoria_id, q } = req.query;
    const where = {};

    if (en_stock !== undefined) where.en_stock = en_stock === 'true';
    if (vendido !== undefined) where.vendido = vendido === 'true';
    if (categoria_id) where.categoria_id = Number(categoria_id);
    if (q) where.referencia = { [Op.iLike]: `%${q}%` };

    const productos = await Producto.findAll({
      where,
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'margen_base', 'cargo_libra_usd'] }],
      order: [['fecha_creacion', 'DESC']]
    });

    res.json(productos);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
export async function getProductById(req, res, next) {
  try {
    const product = await Producto.findByPk(req.params.id, {
      include: [{ model: Categoria, as: 'categoria' }]
    });
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Crear producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [referencia, precio_compra_usd]
 *             properties:
 *               referencia: { type: string, example: "Nike Air Max 90 - US10" }
 *               categoria_id: { type: integer, example: 1 }
 *               descripcion: { type: string }
 *               precio_compra_usd: { type: number, example: 120.00 }
 *               peso_libras: { type: number, example: 1.5 }
 *               talla: { type: string, example: "US10" }
 *               en_stock: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Producto creado
 */
export async function createProduct(req, res, next) {
  try {
    const { referencia, categoria_id, descripcion, precio_compra_usd, peso_libras, talla, en_stock } = req.body;
    if (!referencia || precio_compra_usd === undefined) {
      return res.status(400).json({ message: 'referencia y precio_compra_usd son requeridos' });
    }

    const product = await Producto.create({
      referencia, categoria_id: categoria_id ?? null, descripcion: descripcion ?? null,
      precio_compra_usd, peso_libras: peso_libras ?? 1.0,
      talla: talla ?? null, en_stock: en_stock ?? false
    });

    res.status(201).json(product);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     summary: Actualizar producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
export async function updateProduct(req, res, next) {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    await product.update(req.body);
    res.json(product);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Eliminar producto (solo si no tiene pedido asociado)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
export async function deleteProduct(req, res, next) {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (product.vendido) {
      return res.status(409).json({ message: 'No se puede eliminar un producto ya vendido' });
    }
    await product.destroy();
    res.json({ message: 'Producto eliminado', id: req.params.id });
  } catch (err) { next(err); }
}

import { Producto } from '../database/models/producto.model.js';
import { Categoria } from '../database/models/categoria.model.js';
import { Op } from 'sequelize';
import priceCalculatorService from '../services/price-calculator.service.js';
import trmService from '../services/trm.service.js';

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
 *               precio_venta_cop: { type: number, example: 450000 }
 *               peso_libras: { type: number, example: 1.5 }
 *               talla: { type: string, example: "US10" }
 *               en_stock: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Producto creado
 */
export async function createProduct(req, res, next) {
  try {
    const { referencia, categoria_id, descripcion, precio_compra_usd, peso_libras, talla, en_stock, genero } = req.body;
    if (!referencia || precio_compra_usd === undefined) {
      return res.status(400).json({ message: 'referencia y precio_compra_usd son requeridos' });
    }

    let precio_venta_cop = null;
    if (en_stock) {
      const calc = await priceCalculatorService.cotizar({
        precioCompraUsd: Number(precio_compra_usd),
        pesoLibras: Number(peso_libras || 1.0),
        categoria_id: categoria_id ? Number(categoria_id) : null
      });
      precio_venta_cop = calc.resumen.precio_final_cop;
    }

    const product = await Producto.create({
      referencia, 
      categoria_id: categoria_id ?? null, 
      descripcion: descripcion ?? null,
      precio_compra_usd, 
      peso_libras: peso_libras ?? 1.0,
      talla: talla ?? null, 
      en_stock: en_stock ?? false,
      genero: genero || 'unisex',
      precio_venta_cop
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
    
    // Si cambia precio, peso o categoría y está en stock, recalculamos
    const { precio_compra_usd, peso_libras, categoria_id, en_stock } = req.body;
    let dataToUpdate = { ...req.body };

    if (en_stock === true || (product.en_stock && (precio_compra_usd !== undefined || peso_libras !== undefined || categoria_id !== undefined))) {
       const calc = await priceCalculatorService.cotizar({
         precioCompraUsd: Number(precio_compra_usd ?? product.precio_compra_usd),
         pesoLibras: Number(peso_libras ?? product.peso_libras),
         categoria_id: categoria_id ? Number(categoria_id) : product.categoria_id
       });
       
       // Si el usuario no envió un precio manual, aplicamos el recalculado
       if (req.body.precio_venta_cop === undefined) {
          dataToUpdate.precio_venta_cop = calc.resumen.precio_final_cop;
       }
    }

    await product.update(dataToUpdate);
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
/**
 * @openapi
 * /products/recalculate:
 *   post:
 *     summary: Recalcular precios de todo el stock disponible
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
export async function recalculateStockPrices(req, res, next) {
  try {
    const { mode, trmManual } = req.body; // mode: 'historico', 'actual', 'manual'
    const products = await Producto.findAll({
      where: { en_stock: true, vendido: false }
    });
    
    let updatedCount = 0;
    const currentTrm = mode === 'actual' ? (await trmService.getTrmValue()) : null;

    for (const prod of products) {
       let trmToUse = null;

       if (mode === 'manual') {
         trmToUse = Number(trmManual);
       } else if (mode === 'actual') {
         trmToUse = currentTrm;
       } else {
         // mode === 'historico' (default)
         trmToUse = prod.trm_compra ? Number(prod.trm_compra) : await trmService.getHistoricalTrm(prod.fecha_creacion);
       }

       const calc = await priceCalculatorService.cotizar({
         precioCompraUsd: Number(prod.precio_compra_usd),
         pesoLibras: Number(prod.peso_libras),
         categoria_id: prod.categoria_id,
         trmManual: trmToUse
       });

       await prod.update({ 
         precio_venta_cop: calc.resumen.precio_final_cop,
         trm_compra: trmToUse // Guardamos la TRM usada para que quede anclado
       });

       updatedCount++;
    }

    res.json({ 
       message: 'Sincronización de precios finalizada', 
       updatedCount,
       modo: mode || 'historico'
    });
  } catch (err) { next(err); }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (product.vendido) {
      return res.status(409).json({ message: 'No se puede eliminar un producto ya vendido' });
    }
    // Borrado lógico: inactivar para el catálogo
    await product.update({ en_stock: false });
    res.json({ message: 'Producto inactivado del catálogo con éxito', id: req.params.id });
  } catch (err) { next(err); }
}

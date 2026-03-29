import { Categoria } from "../database/models/categoria.model.js";

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Listar categorías
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías con margen y cargo/libra
 */
export async function listCategories(req, res, next) {
  try {
    const categorias = await Categoria.findAll({ order: [["nombre", "ASC"]] });
    res.json(categorias);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Crear categoría
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: "Sneakers" }
 *               margen_base: { type: number, example: 0.20 }
 *               cargo_libra_usd: { type: number, example: 2.00 }
 *     responses:
 *       201:
 *         description: Categoría creada
 */
export async function createCategory(req, res, next) {
  try {
    const { nombre, margen_base, cargo_libra_usd } = req.body;
    if (!nombre)
      return res.status(400).json({ message: "nombre es requerido" });

    const existe = await Categoria.findOne({ where: { nombre } });
    if (existe) return res.status(409).json({ message: "Categoría ya existe" });

    const cat = await Categoria.create({
      nombre,
      margen_base: margen_base ?? 0.2,
      cargo_libra_usd: cargo_libra_usd ?? 2.0,
    });
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     summary: Actualizar categoría
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 */
export async function updateCategory(req, res, next) {
  try {
    const cat = await Categoria.findByPk(req.params.id);
    if (!cat)
      return res.status(404).json({ message: "Categoría no encontrada" });
    await cat.update(req.body);
    res.json(cat);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Eliminar categoría
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 */
export async function deleteCategory(req, res, next) {
  try {
    const cat = await Categoria.findByPk(req.params.id);
    if (!cat)
      return res.status(404).json({ message: "Categoría no encontrada" });
    await cat.destroy();
    res.json({ message: "Categoría eliminada", id: req.params.id });
  } catch (err) {
    next(err);
  }
}

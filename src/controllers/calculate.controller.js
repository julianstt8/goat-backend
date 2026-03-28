import priceCalculator from '../services/price-calculator.service.js';
import trmService from '../services/trm.service.js';

/**
 * @openapi
 * tags:
 *   - name: Calculadora
 *     description: Motor de cotización de precios en tiempo real
 */

// ── GET /calculate/trm ────────────────────────────────────────────────────────

/**
 * @openapi
 * /calculate/trm:
 *   get:
 *     summary: TRM actual en tiempo real
 *     description: Consulta la TRM oficial (USD→COP) desde múltiples fuentes con caché de 1 hora.
 *     tags: [Calculadora]
 *     responses:
 *       200:
 *         description: Valor TRM actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valor: { type: number, example: 4215.50 }
 *                 fuente: { type: string, example: "_fetchTrmColombia" }
 *                 actualizado: { type: string, format: date-time }
 *                 con_offset: { type: number, example: 4415.50 }
 */
export async function getTrm(req, res, next) {
  try {
    const trm = await trmService.getCurrentTrm();
    res.json({
      valor: trm.valor,
      fuente: trm.fuente,
      actualizado: trm.cachedAt,
      con_offset_200: trm.valor + 200
    });
  } catch (err) { next(err); }
}

// ── GET /calculate/trm/refresh ────────────────────────────────────────────────

/**
 * @openapi
 * /calculate/trm/refresh:
 *   post:
 *     summary: Forzar actualización de caché TRM
 *     tags: [Calculadora]
 *     responses:
 *       200:
 *         description: TRM refrescada
 */
export async function refreshTrm(req, res, next) {
  try {
    trmService.invalidateCache();
    const trm = await trmService.getCurrentTrm();
    res.json({ message: 'TRM actualizada', ...trm });
  } catch (err) { next(err); }
}

// ── POST /calculate ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /calculate:
 *   post:
 *     summary: Cotizar un producto
 *     description: |
 *       Calcula el precio de venta en COP aplicando todas las "Gemas":
 *       - **TRM en tiempo real** + offset de protección (default +200 COP)
 *       - **Cargo por libra** según categoría (Sneakers: $2/lb, Perfumes: $3.5/lb)
 *       - **Cargo fijo** de envío internacional ($16 USD)
 *       - **Margen** leído desde la BD según categoría (o manual)
 *       - **IVA** 19%
 *       - **Redondeo** al mil superior
 *     tags: [Calculadora]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [precioCompraUsd]
 *             properties:
 *               precioCompraUsd:
 *                 type: number
 *                 example: 130.00
 *                 description: Precio de compra en USD
 *               pesoLibras:
 *                 type: number
 *                 example: 1.5
 *               categoria_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID de categoría en BD (lee margen y cargo/lb automáticamente)
 *               categoriaTexto:
 *                 type: string
 *                 example: "Sneakers"
 *                 description: Nombre alternativo si no hay categoria_id
 *               margenBase:
 *                 type: number
 *                 example: 0.20
 *                 description: Override manual del margen (0.20 = 20%)
 *               trmManual:
 *                 type: number
 *                 example: 4200
 *                 description: Usar TRM fija en lugar de la API
 *     responses:
 *       200:
 *         description: Desglose completo de la cotización
 */
export async function calculatePrice(req, res, next) {
  try {
    const {
      precioCompraUsd, pesoLibras, categoria_id,
      categoriaTexto, margenBase, cargoLibraUsd, trmManual
    } = req.body;

    if (!precioCompraUsd || isNaN(Number(precioCompraUsd))) {
      return res.status(400).json({ message: 'precioCompraUsd es requerido y debe ser un número' });
    }

    const result = await priceCalculator.cotizar({
      precioCompraUsd: Number(precioCompraUsd),
      pesoLibras:      pesoLibras      ? Number(pesoLibras)      : 1.0,
      categoria_id:    categoria_id    ? Number(categoria_id)    : undefined,
      categoriaTexto:  categoriaTexto  ?? '',
      margenBase:      margenBase      ? Number(margenBase)      : undefined,
      cargoLibraUsd:   cargoLibraUsd   ? Number(cargoLibraUsd)   : undefined,
      trmManual:       trmManual       ? Number(trmManual)       : undefined
    });

    res.json(result);
  } catch (err) { next(err); }
}

// ── POST /calculate/batch ─────────────────────────────────────────────────────

/**
 * @openapi
 * /calculate/batch:
 *   post:
 *     summary: Cotizar múltiples productos en una sola llamada
 *     description: Reutiliza la misma TRM para todos los ítems (eficiente).
 *     tags: [Calculadora]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productos]
 *             properties:
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [precioCompraUsd]
 *                   properties:
 *                     referencia: { type: string, example: "Jordan 1 Retro - US10" }
 *                     precioCompraUsd: { type: number, example: 150 }
 *                     pesoLibras: { type: number, example: 1.5 }
 *                     categoria_id: { type: integer, example: 1 }
 *                     categoriaTexto: { type: string, example: "Sneakers" }
 *     responses:
 *       200:
 *         description: Cotización de cada producto + total del pedido
 */
export async function calculateBatch(req, res, next) {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ message: 'productos debe ser un array no vacío' });
    }

    if (productos.length > 20) {
      return res.status(400).json({ message: 'Máximo 20 productos por solicitud' });
    }

    const result = await priceCalculator.cotizarLote(productos);
    res.json(result);
  } catch (err) { next(err); }
}

import trmService from './trm.service.js';
import { Configuracion } from '../database/models/configuracion.model.js';
import { Categoria } from '../database/models/categoria.model.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  MOTOR DE COTIZACIÓN @GOAT.ENCARGOS
 *  Lee todas las constantes desde la BD (tabla configuraciones
 *  y categorias) con fallback a valores seguros.
 *
 *  Fórmula:
 *    subtotal_usd  = precio_usd + (peso × cargo_libra) + cargo_fijo + ganancia_usd
 *    precio_cop    = subtotal_usd × (TRM_oficial + offset)
 *    precio_final  = round_up_1000(precio_cop)
 * ═══════════════════════════════════════════════════════════
 */
class PriceCalculatorService {

  /** Valores seguros si la BD aún no tiene configuraciones */
  static DEFAULTS = {
    trm_offset:           200,   // COP de colchón sobre TRM oficial
    fixed_shipping_usd:    16,   // Cargo fijo de envío internacional
    iva_percent:            0,   // Sin IVA por defecto
    shipping_lb_sneakers:   2.0, // USD/lb Sneakers y Ropa
    shipping_lb_perfume:    3.5  // USD/lb Perfumes y líquidos
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Redondea al mil superior. 963.200 → 964.000 */
  _roundUpToThousand(value) {
    return Math.ceil(value / 1000) * 1000;
  }

  /** Carga toda la config de la BD, mergeando sobre los defaults */
  async _loadConfig() {
    try {
      const rows = await Configuracion.findAll();
      const cfg = { ...PriceCalculatorService.DEFAULTS };
      for (const row of rows) cfg[row.nombre_variable] = Number(row.valor);
      return cfg;
    } catch {
      return { ...PriceCalculatorService.DEFAULTS };
    }
  }

  /**
   * Resuelve los parámetros de la categoría.
   * Si se pasa categoria_id, los lee desde BD.
   * Si no, usa los valores pasados manualmente o los defaults.
   */
  async _resolveCategoria({ categoria_id, categoriaTexto, margenBase, cargoLibraUsd, config }) {
    if (categoria_id) {
      try {
        const cat = await Categoria.findByPk(categoria_id);
        if (cat) {
          return {
            nombre: cat.nombre,
            margen: Number(cat.margen_base ?? 0.20),
            cargoLibra: Number(cat.cargo_libra_usd ?? config.shipping_lb_sneakers)
          };
        }
      } catch { /* silencioso, usa fallback */ }
    }

    // Fallback: decidir cargo por libra según nombre de categoría
    const esPerfume = /perfum|liquid/i.test(categoriaTexto ?? '');
    return {
      nombre: categoriaTexto ?? 'Sin categoría',
      margen: margenBase ?? 0.20,
      cargoLibra: cargoLibraUsd ?? (esPerfume ? config.shipping_lb_perfume : config.shipping_lb_sneakers)
    };
  }

  // ── API Pública ───────────────────────────────────────────────────────────────

  /**
   * Cotiza UN producto.
   *
   * @param {object} p
   * @param {number}  p.precioCompraUsd  - Precio de compra en USD (requerido)
   * @param {number}  [p.pesoLibras]     - Peso en libras (default 1.0)
   * @param {number}  [p.categoria_id]   - ID categoría en BD (usa margen + cargo/lb de BD)
   * @param {string}  [p.categoriaTexto] - Nombre texto (fallback si no hay categoria_id)
   * @param {number}  [p.margenBase]     - Override manual del margen (ej: 0.20)
   * @param {number}  [p.cargoLibraUsd]  - Override manual cargo/lb
   * @param {number}  [p.trmManual]      - Override manual de TRM (no usa API)
   */
  async cotizar(p) {
    const {
      precioCompraUsd,
      pesoLibras = 1.0,
      categoria_id,
      categoriaTexto = '',
      margenBase,
      cargoLibraUsd,
      trmManual
    } = p;

    // 1. Config desde BD
    const config = await this._loadConfig();

    // 2. TRM
    let trmInfo;
    if (trmManual) {
      trmInfo = { valor: Number(trmManual), fuente: 'manual', cachedAt: null };
    } else {
      trmInfo = await trmService.getCurrentTrm();
    }
    const trmOficial = trmInfo.valor;
    const trmCliente = trmOficial + config.trm_offset;

    // 3. Parámetros de categoría
    const cat = await this._resolveCategoria({
      categoria_id, categoriaTexto, margenBase, cargoLibraUsd, config
    });

    // 4. Cálculos en USD ─────────────────────────────────────────────
    const cargoEnvioUsd  = pesoLibras * cat.cargoLibra;
    const cargoFijoUsd   = config.fixed_shipping_usd;
    const gananciaUsd    = precioCompraUsd * cat.margen;
    const subtotalUsd    = precioCompraUsd + cargoEnvioUsd + cargoFijoUsd + gananciaUsd;

    // 5. Conversión a COP ────────────────────────────────────────────
    const copSinIva      = subtotalUsd * trmCliente;
    const copConIva      = copSinIva * (1 + config.iva_percent);
    const precioFinalCop = this._roundUpToThousand(copConIva);

    // 6. Resultado detallado ─────────────────────────────────────────
    return {
      // ─ Entrada
      entrada: {
        precioCompraUsd,
        pesoLibras,
        categoria: cat.nombre,
        margen: `${(cat.margen * 100).toFixed(0)}%`
      },

      // ─ TRM
      trm: {
        oficial: trmOficial,
        offset: config.trm_offset,
        cliente: trmCliente,
        fuente: trmInfo.fuente,
        actualizado: trmInfo.cachedAt
      },

      // ─ Desglose USD
      usd: {
        precio_compra: Number(precioCompraUsd.toFixed(2)),
        ganancia:      Number(gananciaUsd.toFixed(2)),
        cargo_libra:   Number(cargoEnvioUsd.toFixed(2)),
        cargo_fijo:    cargoFijoUsd,
        subtotal:      Number(subtotalUsd.toFixed(2))
      },

      // ─ Desglose COP
      cop: {
        sin_iva:    Math.round(copSinIva),
        iva:        Math.round(copConIva - copSinIva),
        iva_pct:    `${(config.iva_percent * 100).toFixed(0)}%`,
        total:      precioFinalCop
      },

      // ─ Resumen para el cliente
      resumen: {
        precio_final_cop: precioFinalCop,
        abono_50pct:  this._roundUpToThousand(precioFinalCop * 0.5),
        abono_30pct:  this._roundUpToThousand(precioFinalCop * 0.3)
      }
    };
  }

  /**
   * Cotización en lote: recibe un array de productos y cotiza cada uno.
   * Reutiliza la misma TRM y config para todos (eficiencia).
   *
   * @param {Array<object>} items - Array de parámetros por producto
   */
  async cotizarLote(items) {
    if (!items?.length) throw new Error('El array de productos no puede estar vacío');

    const config = await this._loadConfig();
    const trmInfo = await trmService.getCurrentTrm();
    const trmOficial = trmInfo.valor;
    const trmCliente = trmOficial + config.trm_offset;

    const resultados = await Promise.all(items.map(async (item, i) => {
      const {
        precioCompraUsd,
        pesoLibras = 1.0,
        categoria_id,
        categoriaTexto = '',
        margenBase,
        cargoLibraUsd
      } = item;

      const cat = await this._resolveCategoria({
        categoria_id, categoriaTexto, margenBase, cargoLibraUsd, config
      });

      const cargoEnvioUsd  = pesoLibras * cat.cargoLibra;
      const cargoFijoUsd   = config.fixed_shipping_usd;
      const gananciaUsd    = precioCompraUsd * cat.margen;
      const subtotalUsd    = Number(precioCompraUsd || 0) + Number(cargoEnvioUsd || 0) + Number(cargoFijoUsd || 0) + Number(gananciaUsd || 0);
      const copSinIva      = subtotalUsd * trmCliente;
      const copConIva      = copSinIva * (1 + config.iva_percent);
      const precioFinalCop = this._roundUpToThousand(copConIva);

      return {
        item: i + 1,
        referencia: item.referencia ?? `Producto ${i + 1}`,
        categoria: cat.nombre,
        precio_final_cop: precioFinalCop,
        subtotal_usd: Number(Number(subtotalUsd).toFixed(2)),
        abono_50pct: this._roundUpToThousand(precioFinalCop * 0.5)
      };
    }));

    const totalCop = resultados.reduce((sum, r) => sum + r.precio_final_cop, 0);

    return {
      trm: { oficial: trmOficial, cliente: trmCliente, fuente: trmInfo.fuente },
      productos: resultados,
      totales: {
        items: resultados.length,
        total_cop: totalCop,
        abono_50pct: this._roundUpToThousand(totalCop * 0.5)
      }
    };
  }
}

export default new PriceCalculatorService();

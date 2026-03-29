import axios from 'axios';

/**
 * Servicio TRM con múltiples proveedores y caché local.
 *
 * Orden de consulta:
 *  1. Caché en memoria (válida 1 hora)
 *  2. API TRM Colombia (trm-colombia.vercel.app)
 *  3. Banco de la República Colombia (datos.gov.co)
 *  4. ExchangeRate-API (exchangerate-api.com) — COP/USD
 *  5. Fallback: valor de .env → DEFAULT_TRM (default 4200)
 */
class TrmService {
  constructor() {
    this.cachedTrm = null;
    this.lastFetch = null;
    this.cacheDuration = 1000 * 60 * 60; // 1 hora

    // Proveedores en orden de prioridad
    this.providers = [
      this._fetchTrmColombia.bind(this),
      this._fetchBancaRepublica.bind(this),
      this._fetchExchangeRate.bind(this)
    ];
  }

  // ── Provider 1: trm-colombia.vercel.app ─────────────────────────────────────
  async _fetchTrmColombia() {
    const res = await axios.get('https://trm-colombia.vercel.app/api/trm/current', { timeout: 5000 });
    const value = Number(res.data?.valor ?? res.data?.value);
    if (!value || isNaN(value)) throw new Error('TRM Colombia: respuesta inválida');
    return value;
  }

  // ── Provider 2: datos.gov.co (Banco de la República) ────────────────────────
  async _fetchBancaRepublica() {
    const res = await axios.get(
      'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC',
      { timeout: 5000 }
    );
    const value = Number(res.data?.[0]?.valor);
    if (!value || isNaN(value)) throw new Error('Datos.gov.co: respuesta inválida');
    return value;
  }

  // ── Provider 3: exchangerate-api.com (convierte USD→COP) ────────────────────
  async _fetchExchangeRate() {
    const res = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
    const value = Number(res.data?.rates?.COP);
    if (!value || isNaN(value)) throw new Error('ExchangeRate-API: respuesta inválida');
    return value;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Retorna la TRM actual (COP por 1 USD) con caché de 1 hora.
   * Intenta múltiples fuentes antes de usar el fallback.
   */
  async getCurrentTrm() {
    const now = Date.now();

    // Usar caché si está vigente
    if (this.cachedTrm && this.lastFetch && (now - this.lastFetch < this.cacheDuration)) {
      return { valor: this.cachedTrm, fuente: 'cache', cachedAt: new Date(this.lastFetch).toISOString() };
    }

    // Intentar proveedores en orden
    for (const provider of this.providers) {
      try {
        const valor = await provider();
        this.cachedTrm = valor;
        this.lastFetch = now;
        console.log(`[TRM] Obtenida de ${provider.name}: $${valor.toLocaleString('es-CO')}`);
        return { valor, fuente: provider.name, cachedAt: new Date(now).toISOString() };
      } catch (err) {
        console.warn(`[TRM] ${provider.name} falló: ${err.message}`);
      }
    }

    // Último fallback: .env o constante
    const fallback = Number(process.env.DEFAULT_TRM ?? 4200);
    console.error(`[TRM] Todos los proveedores fallaron. Usando fallback: $${fallback}`);
    return { valor: fallback, fuente: 'fallback_env', cachedAt: null };
  }

  /**
   * Fuerza invalidar el caché (útil para testing o refresh manual).
   */
  invalidateCache() {
    this.cachedTrm = null;
    this.lastFetch = null;
  }

  /**
   * Retorna solo el número (compatibilidad hacia atrás).
   */
  async getTrmValue() {
    const result = await this.getCurrentTrm();
    return result.valor;
  }
  
  /**
   * Retorna la TRM oficial para una fecha específica (YYYY-MM-DD).
   * Solo disponible para el proveedor de Banca de la República.
   */
  async getHistoricalTrm(dateString) {
    try {
      const isoDate = new Date(dateString).toISOString().split('T')[0];
      const res = await axios.get(
        `https://www.datos.gov.co/resource/32sa-8pi3.json?vigenciadesde=${isoDate}`,
        { timeout: 5000 }
      );
      const value = Number(res.data?.[0]?.valor);
      if (value && !isNaN(value)) return value;
      
      const fallbackRes = await axios.get(
        `https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC&$where=vigenciadesde <= '${isoDate}'`,
        { timeout: 5000 }
      );
      return Number(fallbackRes.data?.[0]?.valor) || Number(process.env.DEFAULT_TRM ?? 4200);
    } catch (err) {
      console.error(`[TRM Historical] Error para ${dateString}: ${err.message}`);
      return Number(process.env.DEFAULT_TRM ?? 4200);
    }
  }
}

export default new TrmService();

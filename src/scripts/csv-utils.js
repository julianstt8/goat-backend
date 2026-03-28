/**
 * ═══════════════════════════════════════════════════════════════
 *  UTILIDAD DE LECTURA DE CSV
 *  Soporta:
 *   - Separador automático (coma o punto y coma)
 *   - BOM UTF-8 (archivos exportados desde Excel)
 *   - Comillas dobles y valores vacíos
 * ═══════════════════════════════════════════════════════════════
 */
import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';

/**
 * Parsea un archivo CSV y devuelve un array de objetos.
 * @param {string} filePath - Ruta absoluta al archivo CSV
 * @param {object} [options]
 * @param {string} [options.delimiter='auto'] - ',' | ';' | 'auto'
 * @returns {Promise<object[]>}
 */
export async function parseCsv(filePath, { delimiter = 'auto' } = {}) {
  return new Promise((resolve, reject) => {
    const records = [];

    const parser = parse({
      delimiter: delimiter === 'auto' ? undefined : delimiter,
      columns: true,           // Primera fila = headers
      skip_empty_lines: true,
      trim: true,
      bom: true,               // Ignorar BOM de Excel
      relax_column_count: true
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(records));

    createReadStream(filePath).pipe(parser);
  });
}

/**
 * Convierte un valor a número.
 * Maneja formatos: "1.234,56" (europeo) y "1,234.56" (americano)
 */
export function toNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).trim();
  // Formato europeo: 1.234,56 → quitar punto, reemplazar coma
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  // Formato americano: 1,234.56 → quitar coma
  return parseFloat(str.replace(/,/g, '')) || 0;
}

/**
 * Convierte un valor a booleano.
 */
export function toBool(val) {
  if (typeof val === 'boolean') return val;
  const str = String(val ?? '').trim().toLowerCase();
  return ['true', 'si', 'sí', 'yes', '1', 'x', '✓'].includes(str);
}

/**
 * Normaliza una fecha en formato DD/MM/YYYY o YYYY-MM-DD.
 * @returns {Date|null}
 */
export function toDate(val) {
  if (!val) return null;
  const str = String(val).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);

  // DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normaliza un string para comparación (sin tildes, minúsculas).
 */
export function normalize(str) {
  return String(str ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

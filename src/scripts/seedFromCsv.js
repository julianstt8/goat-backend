/**
 * ═══════════════════════════════════════════════════════════════
 *  SCRIPT DE MIGRACIÓN DESDE CSV → PostgreSQL
 *  @goat.encargos
 *
 *  Uso:
 *    node src/scripts/seedFromCsv.js
 *
 *  Archivos esperados en data/:
 *    data/VENTAS.csv    → pedidos + usuarios clientes + pagos
 *    data/STOCK.csv     → productos
 *    data/DEUDORES.csv  → pagos pendientes adicionales (opcional)
 *    data/Gastos-*.csv  → gastos operativos (puede ser varios archivos)
 *
 *  Columnas esperadas:
 *  ─ VENTAS.csv:
 *    fecha_compra | referencia | tracking_number | talla |
 *    valor_original_usd | precio_total_cop | estado_logistico |
 *    ganancia_cop | nombre_cliente | telefono | email |
 *    Anticipo | Abono_1 | Abono_2
 *
 *  ─ STOCK.csv:
 *    articulo | talla | costo_compra_usd | categoria |
 *    precio_venta_cop | en_stock | vendido
 *
 *  ─ Gastos-*.csv:
 *    descripcion | monto_cop | categoria | fecha
 * ═══════════════════════════════════════════════════════════════
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

import { parseCsv, toNumber, toBool, toDate, normalize } from './csv-utils.js';
import { sequelize } from '../database/sequelize.js';
import { loadModels } from '../database/bootstrap.js';
import { Usuario, TIPO_ROL, NIVEL_HYPE } from '../database/models/usuario.model.js';
import { Producto } from '../database/models/producto.model.js';
import { Categoria } from '../database/models/categoria.model.js';
import { Pedido } from '../database/models/pedido.model.js';
import { Pago } from '../database/models/pago.model.js';
import { GastoOperativo } from '../database/models/gasto-operativo.model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

// ── Helpers ──────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`  ${msg}`);
const section = (title) => console.log(`\n${'═'.repeat(55)}\n  ${title}\n${'═'.repeat(55)}`);

/**
 * Mapeo de valores de estado_logistico desde el CSV a nuestro ENUM.
 * Acepta: NO → pendiente, RECIBIDO/CASILLERO → en_casillero,
 *         EN_TRANSITO → en_transito, ENTREGADO → entregado,
 *         COMPRADO → comprado, CANCELADO → cancelado
 */
function mapEstadoLogistico(raw) {
  const val = normalize(raw);
  if (!val || val === 'no' || val === 'pendiente') return 'pendiente';
  if (['comprado', 'pagado'].includes(val))         return 'comprado';
  if (['casillero', 'en_casillero', 'bodega'].includes(val)) return 'en_casillero';
  if (['transito', 'en_transito', 'enviado'].includes(val))  return 'en_transito';
  if (['recibido', 'entregado', 'delivered'].includes(val))   return 'entregado';
  if (['cancelado', 'anulado'].includes(val))                 return 'cancelado';
  return 'pendiente';
}

/**
 * Mapeo de categoría desde texto CSV a nombre de Categoria en BD.
 */
function mapCategoria(raw) {
  const val = normalize(raw);
  if (/sneaker|calzado|zapato|shoe/.test(val)) return 'Sneakers';
  if (/perfum|liquid|fragancia/.test(val))     return 'Perfumería';
  if (/ropa|clothing|camiseta|hoodie/.test(val)) return 'Ropa';
  return 'Sneakers'; // default
}

/**
 * Obtiene o crea un usuario por email o teléfono.
 */
async function getOrCreateUser({ nombre_completo, telefono, email }) {
  const emailLimpio = email?.includes('@') ? email.trim().toLowerCase() : null;
  const telLimpio   = telefono?.replace(/\D/g, '') ? telefono.trim() : null;

  // Buscar por email primero, luego por teléfono
  let user = null;
  if (emailLimpio) {
    user = await Usuario.findOne({ where: { email: emailLimpio } });
  }
  if (!user && telLimpio) {
    user = await Usuario.findOne({ where: { telefono: telLimpio } });
  }

  if (user) return { user, created: false };

  const fallbackEmail = emailLimpio ??
    `${normalize(nombre_completo ?? 'cliente').replace(/\s+/g, '.')}@goatencargos.com`;

  user = await Usuario.create({
    nombre_completo: nombre_completo?.trim() ?? 'Cliente sin nombre',
    email: fallbackEmail,
    telefono: telLimpio,
    password_hash: null, // cliente sin acceso a plataforma
    rol: TIPO_ROL.CLIENTE_STANDARD,
    nivel: NIVEL_HYPE.BRONZE,
    activo: true
  });

  return { user, created: true };
}

/**
 * Obtiene o crea una Categoría por nombre.
 */
async function getOrCreateCategoria(nombre) {
  const [cat] = await Categoria.findOrCreate({
    where: { nombre },
    defaults: {
      margen_base: nombre === 'Perfumería' ? 0.30 : 0.20,
      cargo_libra_usd: nombre === 'Perfumería' ? 3.5 : 2.0
    }
  });
  return cat;
}

// ── Importadores ─────────────────────────────────────────────────────────────

async function importStock(filePath) {
  section('STOCK → Productos');
  let rows;
  try {
    rows = await parseCsv(filePath);
  } catch (err) {
    log(`⚠️  No se encontró STOCK.csv: ${err.message}`);
    return;
  }

  log(`Filas encontradas: ${rows.length}`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    // Nombres de columna flexibles
    const referencia = row.articulo ?? row.referencia ?? row.nombre ?? row.producto;
    if (!referencia) { skipped++; continue; }

    const categoriaNombre = mapCategoria(row.categoria ?? '');
    const cat = await getOrCreateCategoria(categoriaNombre);

    await Producto.create({
      referencia:       referencia.trim(),
      talla:            row.talla?.trim() ?? null,
      precio_compra_usd: toNumber(row.costo_compra_usd ?? row.costo_usd ?? row.precio_usd),
      peso_libras:      toNumber(row.peso_libras ?? row.peso ?? 1.0) || 1.0,
      en_stock:         toBool(row.en_stock ?? 'true'),
      vendido:          toBool(row.vendido ?? 'false'),
      categoria_id:     cat.id,
      fecha_creacion:   new Date()
    });
    created++;
    process.stdout.write(`\r  Importando productos... ${created}/${rows.length}`);
  }

  console.log(`\n  ✅ Productos: ${created} creados, ${skipped} omitidos`);
}

async function importVentas(filePath) {
  section('VENTAS → Usuarios + Pedidos + Pagos');
  let rows;
  try {
    rows = await parseCsv(filePath);
  } catch (err) {
    log(`⚠️  No se encontró VENTAS.csv: ${err.message}`);
    return;
  }

  log(`Filas encontradas: ${rows.length}`);
  let ordersCreated = 0, usersCreated = 0, paymentsCreated = 0, skipped = 0;

  for (const row of rows) {
    const referencia = row.referencia ?? row.producto ?? row.articulo;
    const precioCop  = toNumber(row.precio_total_cop ?? row.precio_cop ?? row.total_cop);

    if (!precioCop || precioCop === 0) { skipped++; continue; }

    // 1. Usuario
    const { user, created: userCreated } = await getOrCreateUser({
      nombre_completo: row.nombre_cliente ?? row.nombre ?? row.cliente,
      telefono:        row.telefono ?? row.celular,
      email:           row.email ?? row.correo
    });
    if (userCreated) usersCreated++;

    // 2. Pedido
    const order = await Pedido.create({
      usuario_id:        user.id,
      tracking_number:   row.tracking_number?.trim() || null,
      estado_logistico:  mapEstadoLogistico(row.estado_logistico ?? row.estado ?? ''),
      precio_venta_cop:  precioCop,
      trm_utilizada:     toNumber(row.trm ?? row.trm_utilizada ?? 4200) || 4200,
      costo_total_usd:   toNumber(row.valor_original_usd ?? row.costo_usd ?? 0) || null,
      fecha_compra:      toDate(row.fecha_compra ?? row.fecha) ?? new Date()
    });
    ordersCreated++;

    // 3. Pagos (Anticipo, Abono 1, Abono 2, Saldo Final)
    const abonos = [
      { campo: 'Anticipo',  tipo: 'Anticipo'  },
      { campo: 'Abono_1',   tipo: 'Abono 1'   },
      { campo: 'Abono_2',   tipo: 'Abono 2'   },
      { campo: 'Abono_3',   tipo: 'Abono 3'   },
      { campo: 'Saldo',     tipo: 'Saldo Final'},
    ];

    for (const { campo, tipo } of abonos) {
      // Buscar la columna con variantes (con espacio, guión, etc.)
      const valor = toNumber(
        row[campo] ?? row[campo.replace('_', ' ')] ??
        row[campo.toLowerCase()] ?? 0
      );
      if (valor > 0) {
        await Pago.create({
          pedido_id:  order.id,
          monto_cop:  valor,
          tipo_abono: tipo,
          fecha_pago: toDate(row.fecha_compra ?? row.fecha) ?? new Date()
        });
        paymentsCreated++;
      }
    }

    process.stdout.write(`\r  Importando ventas... ${ordersCreated}/${rows.length}`);
  }

  console.log(`\n  ✅ Usuarios: ${usersCreated} creados`);
  console.log(`  ✅ Pedidos: ${ordersCreated} creados, ${skipped} omitidos`);
  console.log(`  ✅ Pagos: ${paymentsCreated} creados`);
}

async function importGastos(dataDir) {
  section('GASTOS → GastosOperativos');

  // Buscar todos los archivos Gastos-*.csv y gastos.csv
  let files;
  try {
    files = readdirSync(dataDir).filter(f =>
      /^gastos/i.test(f) && f.endsWith('.csv')
    );
  } catch {
    log('⚠️  No se encontró la carpeta data/');
    return;
  }

  if (!files.length) { log('⚠️  No se encontraron archivos Gastos-*.csv'); return; }
  log(`Archivos encontrados: ${files.join(', ')}`);

  let total = 0;
  const TIPO_GASTO_MAP = {
    marketing:  'marketing', pauta: 'marketing',
    logistica:  'logistica', envio: 'logistica',
    impuesto:   'impuestos',
    operativo:  'operativo',
    personal:   'personal'
  };

  for (const file of files) {
    const rows = await parseCsv(join(dataDir, file));
    for (const row of rows) {
      const monto = toNumber(row.monto_cop ?? row.monto ?? row.valor);
      if (!monto) continue;

      const catRaw = normalize(row.categoria ?? row.tipo ?? 'operativo');
      const cat = Object.entries(TIPO_GASTO_MAP)
        .find(([k]) => catRaw.includes(k))?.[1] ?? 'operativo';

      await GastoOperativo.create({
        descripcion: (row.descripcion ?? row.concepto ?? 'Gasto importado').trim().slice(0, 200),
        monto_cop:   monto,
        categoria:   cat,
        fecha_gasto: toDate(row.fecha ?? row.fecha_gasto) ?? new Date()
      });
      total++;
    }
    log(`  ${file}: ${rows.length} filas`);
  }

  log(`✅ Gastos: ${total} registros creados`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Iniciando migración CSV → PostgreSQL @goat.encargos\n');

  await sequelize.authenticate();
  log('✅ Conectado a PostgreSQL');
  await loadModels();
  log('✅ Modelos cargados');

  // Asegurar categorías base antes de importar
  for (const nom of ['Sneakers', 'Ropa', 'Perfumería']) {
    await getOrCreateCategoria(nom);
  }
  log('✅ Categorías base verificadas');

  await importStock(join(DATA_DIR, 'STOCK.csv'));
  await importVentas(join(DATA_DIR, 'VENTAS.csv'));
  await importGastos(DATA_DIR);

  section('MIGRACIÓN COMPLETA ✅');
  await sequelize.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error en migración:', err.message);
  console.error(err.stack);
  process.exit(1);
});

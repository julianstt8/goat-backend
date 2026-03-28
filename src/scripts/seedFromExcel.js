/**
 * ═══════════════════════════════════════════════════════════════
 *  SCRIPT DE MIGRACIÓN DESDE EXCEL → PostgreSQL
 *  @goat.encargos
 *
 *  Lee un único archivo .xlsx con múltiples hojas:
 *    - Hoja "Ventas"  → usuarios + pedidos + pagos
 *    - Hoja "Stock"   → productos
 *    - Hoja "Gastos"  → gastos operativos
 *    (Nombres de hoja flexibles — ver sección de detección abajo)
 *
 *  Uso:
 *    node src/scripts/seedFromExcel.js data/GOAT.xlsx
 *    node src/scripts/seedFromExcel.js data/MiArchivo.xlsx
 *
 *  Si no se pasa argumento, busca automáticamente en data/*.xlsx
 * ═══════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

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

// ── Utilidades ────────────────────────────────────────────────────────────────

const log     = (msg) => console.log(`  ${msg}`);
const section = (t)   => console.log(`\n${'═'.repeat(58)}\n  ${t}\n${'═'.repeat(58)}`);

/** Valor numérico limpio (maneja vacíos, strings con puntos/comas) */
function num(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  
  if (!s) return 0;

  // Si tiene coma y punto, asumimos formato con separador de miles
  // Ejemplo: 1.234,56 (europeo) o 1,234.56 (americano)
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Europeo: 1.234,56
      return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      // Americano: 1,234.56
      return parseFloat(s.replace(/,/g, ''));
    }
  }

  // Si solo tiene uno de los dos
  if (hasComma) {
    // Si solo hay una coma y parece decimal (e.g. 12,5), la tratamos como punto
    // Pero si es 1,234 (miles), la quitamos. 
    // Por simplicidad en este negocio: si hay coma, es separador decimal.
    return parseFloat(s.replace(',', '.'));
  }

  return parseFloat(s) || 0;
}

/** Boolean: true/false/si/x/1 */
function bool(val) {
  const s = String(val ?? '').trim().toLowerCase();
  return ['true','si','sí','yes','1','x','✓'].includes(s);
}

/** Normalizar texto para comparación sin tildes */
function norm(s) {
  return String(s ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Fecha desde valor Excel (número serial, string DD/MM/YYYY, o Date)
 */
function toDate(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  
  // SheetJS puede devolver un número serial de Excel
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  const s = String(val).trim();
  if (s === '-' || s === 'X' || s === '') return null;

  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? (parseInt(y) < 50 ? '20' + y : '19' + y) : y;
    const date = new Date(`${year}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T05:00:00Z`);
    return isNaN(date.getTime()) ? null : date;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Leer Excel ────────────────────────────────────────────────────────────────

/**
 * Carga el archivo Excel y devuelve un mapa: { nombreHoja: [rows] }
 */
function loadExcel(filePath) {
  log(`Leyendo: ${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const result = {};
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    result[sheetName] = XLSX.utils.sheet_to_json(ws, {
      defval: '',
      blankrows: false,
      raw: false   // valores como string, no raw
    });
    log(`  Hoja "${sheetName}": ${result[sheetName].length} filas`);
  }
  return result;
}

/**
 * Detecta qué hoja corresponde a cada entidad por nombre.
 * Acepta: Ventas, ventas, Sales, VENTAS, Venta, etc.
 */
function detectSheets(sheets) {
  const names = Object.keys(sheets);
  const find = (...patterns) =>
    names.find(n => patterns.some(p => norm(n).includes(p))) ?? null;

  return {
    ventas:  find('venta', 'sale', 'pedido', 'orden'),
    stock:   find('stock', 'inventario', 'producto', 'catalogo', 'catálogo'),
    gastos:  find('gasto', 'expense', 'egreso', 'costo')
  };
}

// ── Helpers de BD ─────────────────────────────────────────────────────────────

function mapCategoria(raw) {
  const v = norm(raw ?? '');
  if (/perfum|liquid|fragancia|colonia/.test(v)) return 'Perfumería';
  if (/ropa|clothing|camiseta|hoodie|polo/.test(v)) return 'Ropa';
  return 'Sneakers';
}

function mapEstado(raw) {
  const v = norm(raw ?? '');
  if (!v || v === 'no' || v === 'pendiente') return 'pendiente';
  if (['comprado','pagado'].includes(v))      return 'comprado';
  if (/casillero|bodega/.test(v))             return 'en_casillero';
  if (/transito|enviado/.test(v))             return 'en_transito';
  if (/recibido|entregado|delivered/.test(v)) return 'entregado';
  if (/cancel|anulan/.test(v))                return 'cancelado';
  return 'pendiente';
}

async function getOrCreateCategoria(nombre) {
  const [cat] = await Categoria.findOrCreate({
    where: { nombre },
    defaults: {
      margen_base:    nombre === 'Perfumería' ? 0.30 : 0.20,
      cargo_libra_usd: nombre === 'Perfumería' ? 3.50 : 2.00
    }
  });
  return cat;
}

async function getOrCreateUser({ nombre_completo, telefono, email }) {
  const emailOk = email?.includes('@') ? email.trim().toLowerCase() : null;
  const telOk   = (telefono && String(telefono).replace(/\D/g, '').length >= 7) 
                 ? String(telefono).replace(/\D/g, '') 
                 : null;

  let user = null;
  // 1. Buscar por email explícito
  if (emailOk) user = await Usuario.findOne({ where: { email: emailOk } });
  
  // 2. Buscar por teléfono (si existe y es válido)
  if (!user && telOk) user = await Usuario.findOne({ where: { telefono: telOk } });
  
  if (user) return { user, created: false };

  // 3. Buscar por fallback de nombre si no hay email
  const nombreLimpio = norm(nombre_completo ?? 'cliente').replace(/\s+/g, '.');
  const fallback = emailOk ?? `${nombreLimpio}@goatencargos.com`;
  
  // Re-buscar antes de crear
  user = await Usuario.findOne({ where: { email: fallback } });
  if (user) return { user, created: false };

  // 4. Crear si no existe nada
  user = await Usuario.create({
    nombre_completo: (nombre_completo ?? 'Cliente').trim(),
    email:           fallback,
    telefono:        telOk, // null if invalid/missing
    password_hash:   null,
    rol:             TIPO_ROL.CLIENTE_STANDARD,
    nivel:           NIVEL_HYPE.BRONZE,
    activo:          true
  });
  return { user, created: true };
}

// ── Importadores por hoja ─────────────────────────────────────────────────────

async function importStock(rows) {
  section(`STOCK → Productos (${rows.length} filas)`);
  let created = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = {};
    for (const key of Object.keys(rawRow)) row[norm(key)] = rawRow[key];

    const ref = row.referencia ?? row.articulo ?? row.producto ?? row.stock;
    if (!ref || String(ref).trim() === '' || norm(ref).includes('stock')) { 
      skipped++; 
      continue; 
    }

    const catNombre = mapCategoria(row.categoria ?? '');
    const cat = await getOrCreateCategoria(catNombre);

    try {
      await Producto.create({
        referencia:        String(ref).trim(),
        talla:             String(row.talla ?? '').trim() || null,
        precio_compra_usd: num(row['costo compra usd'] ?? row['costo usd'] ?? row['valor original'] ?? row.costo),
        peso_libras:       num(row['peso libras'] ?? row.peso ?? 1) || 1.0,
        en_stock:          bool(row['en stock'] ?? 'true'),
        vendido:           bool(row.vendido ?? 'false'),
        categoria_id:      cat.id
      });
      created++;
    } catch (e) {
      log(`   ❌ Error fila ${i} (${ref}): ${e.message}`);
      skipped++;
    }
  }
  log(`✅ Stock: ${created} creados, ${skipped} omitidos`);
}

async function importVentas(rows) {
  section(`VENTAS → Usuarios + Pedidos + Pagos (${rows.length} filas)`);
  let orders = 0, users = 0, payments = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    if (i === 0) {
      log(`   DEBUG: Fila 0 Raw: ${JSON.stringify(rawRow)}`);
    }
    const row = {};
    for (const key of Object.keys(rawRow)) row[norm(key)] = rawRow[key];

    const precioCop = num(row['precio total'] ?? row.precio_total_cop ?? row.total);
    const referencia = row['referencia'] ?? row.articulo ?? row.producto;
    
    if (!precioCop || !referencia) { 
      // Si la fila está vacía, no loguear error, solo saltar
      if (!rawRow['Cliente'] && !rawRow['Referencia']) {
        skipped++; 
        continue;
      }
      log(`   ⚠️ Fila ${i} omitida: falta precio (${precioCop}) o referencia (${referencia})`);
      skipped++; 
      continue; 
    }

    try {
      const uData = {
        nombre_completo: row['cliente'] ?? row.nombre,
        telefono:        row['celular'] ?? row['telefono'],
        email:           row['email'] ?? row.correo
      };
      
      const { user, created } = await getOrCreateUser(uData);
      if (created) users++;

      log(`   📦 [${i}] Pedido: ${referencia.slice(0,20)}... | Cliente: ${uData.nombre_completo}`);

      const order = await Pedido.create({
        usuario_id:       user.id,
        tracking_number:  String(row['tracking'] ?? '').trim() || null,
        estado_logistico: mapEstado(row['en casillero'] ?? ''),
        precio_venta_cop: precioCop,
        trm_utilizada:    num(row['trm'] ?? 4200) || 4200,
        costo_total_usd:  num(row['valor original'] ?? row.costo_usd) || null,
        fecha_compra:     toDate(row['fecha compra'] ?? row.fecha) ?? new Date()
      });
      orders++;

      const ABONOS = [
        { label: 'Anticipo',  normKey: 'anticipo' },
        { label: 'Abono 1',   normKey: 'abono 1' },
        { label: 'Abono 2',   normKey: 'abono 2' },
        { label: 'Saldo',     normKey: 'saldo' }
      ];

      for (const group of ABONOS) {
        let val = num(row[group.normKey]);
        if (val > 0) {
          await Pago.create({
            pedido_id:  order.id,
            monto_cop:  val,
            tipo_abono: group.label,
            fecha_pago: toDate(row['fecha compra'] ?? row.fecha) ?? new Date()
          });
          payments++;
        }
      }
    } catch (e) {
      log(`   ❌ Error fila ${i} (${referencia}): ${e.message}`);
      skipped++;
    }
  }

  log(`\n  ✅ Usuarios nuevos: ${users}`);
  log(`  ✅ Pedidos: ${orders}, omitidos: ${skipped}`);
  log(`  ✅ Pagos: ${payments}\n`);
}

async function importGastos(rows) {
  section(`GASTOS → GastosOperativos (${rows.length} filas)`);
  let created = 0, skipped = 0;

  const CAT_MAP = {
    marketing: 'marketing', pauta: 'marketing', publicidad: 'marketing',
    logistica: 'logistica', envio: 'logistica', bodega: 'logistica',
    impuesto: 'impuestos', impuestos: 'impuestos',
    personal: 'personal', nomina: 'personal', sueldo: 'personal',
    operativo: 'operativo'
  };

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = {};
    for (const key of Object.keys(rawRow)) {
      row[norm(key)] = rawRow[key];
    }

    const monto = num(row.gastado ?? row.monto ?? row.valor);
    if (!monto) { skipped++; continue; }

    const catRaw = norm(row.categoria ?? row.tipo ?? 'operativo');
    const cat = Object.entries(CAT_MAP).find(([k]) => catRaw.includes(k))?.[1] ?? 'operativo';

    try {
      await GastoOperativo.create({
        descripcion: (row.descripcion ?? row.concepto ?? row.detalle ?? row.cami ?? 'Gasto importado')
                      .trim().slice(0, 200),
        monto_cop:   monto,
        categoria:   cat,
        fecha_gasto: toDate(row.fecha ?? row.fecha_gasto) ?? new Date()
      });
      created++;
    } catch (e) {
      log(`❌ Error gasto fila ${i}: ${e.message}`);
      skipped++;
    }
  }
  console.log(`  ✅ Gastos: ${created} creados, ${skipped} omitidos\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Determinar archivo a usar
  let filePath = process.argv[2];

  if (!filePath) {
    // Auto-detectar .xlsx en data/
    const files = readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    if (!files.length) {
      console.error('\n❌ No se encontró ningún archivo .xlsx en la carpeta data/');
      console.error('   Uso: node src/scripts/seedFromExcel.js data/MiArchivo.xlsx\n');
      process.exit(1);
    }
    filePath = join(DATA_DIR, files[0]);
    console.log(`\n📄 Archivo detectado automáticamente: ${files[0]}`);
  }

  filePath = resolve(filePath);
  if (!existsSync(filePath)) {
    console.error(`\n❌ Archivo no encontrado: ${filePath}\n`);
    process.exit(1);
  }

  console.log('\n🚀 Iniciando migración Excel → PostgreSQL @goat.encargos\n');

  await sequelize.authenticate();
  await loadModels();

  // Asegurar categorías base
  for (const n of ['Sneakers', 'Ropa', 'Perfumería']) await getOrCreateCategoria(n);

  // Cargar Excel y detectar hojas
  const sheets = loadExcel(filePath);
  const { ventas, stock, gastos } = detectSheets(sheets);

  console.log('\n📋 Hojas detectadas:');
  console.log(`   Stock:  ${stock  ?? '⚠️  no encontrada'}`);
  console.log(`   Ventas: ${ventas ?? '⚠️  no encontrada'}`);
  console.log(`   Gastos: ${gastos ?? '⚠️  no encontrada'}`);

  if (stock)  await importStock(sheets[stock]);
  if (ventas) await importVentas(sheets[ventas]);
  if (gastos) await importGastos(sheets[gastos]);

  section('✅ MIGRACIÓN COMPLETA');
  console.log('');
  await sequelize.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error en migración:', err.message);
  console.error(err.stack);
  sequelize.close();
  process.exit(1);
});

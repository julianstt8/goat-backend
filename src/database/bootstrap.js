import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sequelize } from './sequelize.js';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODELS_DIR = join(__dirname, 'models');

// Convierte snake-case o kebab-case a PascalCase
function toPascalCase(str) {
  return str
    .replace(/(^\w|[-_]\w)/g, match => match.replace(/[-_]/, '').toUpperCase());
}

export async function loadModels() {
  const files = await readdir(MODELS_DIR);
  const modelFiles = files.filter(f => f.endsWith('.model.js'));

  /** @type {Record<string, any>} */
  const models = {};

  // 1) Importar todos los modelos
  for (const f of modelFiles) {
    const full = pathToFileURL(join(MODELS_DIR, f)).href;
    const mod = await import(full);
    const modelName = toPascalCase(f.replace('.model.js', ''));

    for (const [key, val] of Object.entries(mod)) {
      if (val?.sequelize && typeof val.getTableName === 'function') {
        models[modelName] = val;
      }
    }
  }

  // 2) Ejecutar associate(models) una vez que TODOS los modelos existen
  for (const f of modelFiles) {
    const full = pathToFileURL(join(MODELS_DIR, f)).href;
    const mod = await import(full);
    for (const [key, val] of Object.entries(mod)) {
      if (typeof val === 'function' && key === 'associate') {
        val(models);
      }
    }
  }

  return models;
}

/** Solo debug: imprime los alias registrados por cada modelo */
export function logAssociations(models) {
  console.log('🔗 Associations map:');
  for (const [name, model] of Object.entries(models)) {
    const assocs = model.associations ?? {};
    const aliases = Object.keys(assocs);
    console.log(`  • ${name}: ${aliases.length ? aliases.join(', ') : '(sin asociaciones)'}`);
  }
}

/** Auto‑test opcional: intenta incluir asociaciones clave para fallar temprano si falta algo */
export async function associationsSelfTest(models) {
  /*const { Store, ProductImage } = models;
  if (Store) {
    try {
      await Store.findOne({
        include: [
          { association: 'country', attributes: ['id'] },
          { association: 'state',   attributes: ['id'] },
          { association: 'city',    attributes: ['id'] },
        ]
      });
      console.log('✅ Store associations self-test passed');
    } catch (e) {
      console.error('❌ Store associations self-test failed:', e?.message || e);
    }
  }*/
}


export async function syncDatabase() {
  await sequelize.authenticate();
  console.log('✅ Conectado a PostgreSQL');

  // Asegurar que la extensión para UUID exista
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  console.log('✅ Extensión uuid-ossp verificada');

  const models = await loadModels();

  // DEBUG: ver asociaciones al arrancar
  logAssociations(models);

  if (env.nodeEnv === 'development') {
    await sequelize.sync({ alter: true });
    console.log('🛠️  Modelos sincronizados (alter) en desarrollo');
  }

  // Auto‑test (opcional)
  await associationsSelfTest(models);

  return models;
}

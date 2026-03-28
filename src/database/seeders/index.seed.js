import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import env from '../../config/env.js';
import { sequelize } from '../sequelize.js';
import { loadModels } from '../bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEEDERS_DIR = __dirname;

function canRunSeeds() {
  if (env.nodeEnv === 'development') return true;
  // Producción: solo si variable explícita está en true
  return String(process.env.SEED_ALLOW_PROD ?? 'false') === 'true';
}

async function discoverSeedFiles() {
  const files = await readdir(SEEDERS_DIR);
  return files
    .filter(f => f.endsWith('.seed.js') && f !== 'index.seed.js')
    .sort(); // orden por nombre — 01_, 02_, etc.
}

async function run() {
  const logger = console;

  if (!canRunSeeds()) {
    logger.log(`Seeds blocked. NODE_ENV=${env.nodeEnv}. Set SEED_ALLOW_PROD=true to allow (danger).`);
    process.exit(0);
  }

  await sequelize.authenticate();
  logger.log('DB connected');

  // Asegura modelos cargados (y que existan tablas en dev si usas sync en bootstrap)
  await loadModels();

  const files = await discoverSeedFiles();
  if (files.length === 0) {
    logger.log('No seed files found.');
    process.exit(0);
  }

  for (const f of files) {
    const full = pathToFileURL(join(SEEDERS_DIR, f)).href;
    // eslint-disable-next-line no-await-in-loop
    const mod = await import(full);

    if (typeof mod.up === 'function') {
      logger.log(`Running seed: ${f}`);
      // eslint-disable-next-line no-await-in-loop
      await mod.up({ logger });
    } else {
      logger.log(`Seed ${f} has no 'up' function. Skipped.`);
    }
  }

  logger.log('All seeds executed.');
  process.exit(0);
}

run().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

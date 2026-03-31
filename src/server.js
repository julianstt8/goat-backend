process.env.TZ = 'America/Bogota';
import env from './config/env.js';
import app from './app.js';
import { syncDatabase } from './database/bootstrap.js';

async function start() {
  await syncDatabase();

  const server = app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
start();

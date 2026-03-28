import { Sequelize } from 'sequelize';
import env from '../config/env.js';

export const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.pass,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: 'postgres',
    logging: env.db.logging ? console.log : false
  }
);

export async function testDbConnection() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida correctamente.');
  } catch (err) {
    console.error('Error conectando a PostgreSQL:', err?.message ?? err);
    process.exit(1);
  }
}

import { sequelize } from '../database/sequelize.js';
import env from '../config/env.js';

export const getHealth = async (req, res, next) => {
  try {
    // Ping mínimo a la DB
    const [rows] = await sequelize.query('SELECT 1 AS ok');

    // Opcional: latencia (ms) de la consulta
    const dbOk = rows?.[0]?.ok === 1;

    res.status(200).json({
      app: 'ok',
      env: env.nodeEnv,
      db: dbOk ? 'ok' : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Si falla el ping, devolvemos estado degradado,
    // pero no exponemos detalles de error en producción.
    res.status(200).json({
      app: 'degraded',
      env: env.nodeEnv,
      db: 'error',
      timestamp: new Date().toISOString()
    });
    // Log interno
    next(err);
  }
};

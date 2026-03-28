import bcrypt from 'bcrypt';
import env from '../config/env.js';

const ROUNDS = Number(env.bcryptRounds ?? 12);

/**
 * Genera el hash de una contraseña en texto plano.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS);
}

/**
 * Compara una contraseña en texto plano con su hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

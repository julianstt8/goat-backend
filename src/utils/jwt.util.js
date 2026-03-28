import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Genera un JWT firmado con el payload dado.
 * @param {object} payload - Datos a incluir en el token (id, rol, email, etc.)
 * @returns {string}
 */
export function signJwt(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

/**
 * Verifica y decodifica un JWT.
 * @param {string} token
 * @returns {object} payload decodificado
 */
export function verifyJwt(token) {
  return jwt.verify(token, env.jwt.secret);
}

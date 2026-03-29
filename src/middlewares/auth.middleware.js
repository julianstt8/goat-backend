import { verifyJwt } from '../utils/jwt.util.js';

export function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    const payload = verifyJwt(token);
    req.user = payload; // { id, role, store_id, iat, exp }
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.rol; // Cambiado de 'role' a 'rol' para coincidir con el payload del JWT
    if (!role) return res.status(401).json({ message: 'No autenticado' });
    if (!allowedRoles.includes(role)) return res.status(403).json({ message: 'No autorizado' });
    next();
  };
}

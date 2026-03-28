import { Usuario } from '../models/usuario.model.js';
import { TIPO_ROL, NIVEL_HYPE } from '../models/usuario.model.js';
import { hashPassword } from '../../utils/crypto.util.js';

/**
 * Seeder: Usuario administrador inicial del sistema.
 * IMPORTANTE: Cambia el password antes de pasar a producción.
 */
export async function up({ logger }) {
  const email = 'admin@goatencargos.com';

  const existe = await Usuario.findOne({ where: { email } });
  if (existe) {
    logger.log(`⚠️  Admin ya existe (${email}), se omite.`);
    return;
  }

  const password_hash = await hashPassword('Goat2025*'); // ← Cambiar en producción

  await Usuario.create({
    nombre_completo: 'Julian Admin',
    email,
    password_hash,
    rol: TIPO_ROL.SUPER_ADMIN,
    nivel: NIVEL_HYPE.DIAMOND,
    activo: true
  });

  logger.log(`✅ Admin inicial creado: ${email} (password: Goat2025*)`);
  logger.log('⚠️  Recuerda cambiar la contraseña del admin en producción.');
}

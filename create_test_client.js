import { sequelize } from './src/database/sequelize.js';
import { loadModels } from './src/database/bootstrap.js';
import { Usuario, TIPO_ROL } from './src/database/models/usuario.model.js';
import { hashPassword } from './src/utils/crypto.util.js';

async function main() {
  await sequelize.authenticate();
  await loadModels();
  
  const email = 'cliente@test.com';
  const pass = 'password123';
  
  const existe = await Usuario.findOne({ where: { email } });
  if (existe) {
    await existe.destroy();
  }

  const password_hash = await hashPassword(pass);
  await Usuario.create({
    nombre_completo: 'Cliente de Prueba',
    email,
    password_hash,
    rol: TIPO_ROL.CLIENTE_STANDARD,
    activo: true
  });

  console.log(`✅ Cliente creado: ${email} (password: ${pass})`);
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

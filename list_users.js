import { sequelize } from './src/database/sequelize.js';
import { loadModels } from './src/database/bootstrap.js';
import { Usuario } from './src/database/models/usuario.model.js';

async function main() {
  await sequelize.authenticate();
  await loadModels();
  const users = await Usuario.findAll({ attributes: ['id', 'nombre_completo', 'email', 'rol'] });
  console.log(JSON.stringify(users, null, 2));
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

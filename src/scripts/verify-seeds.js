import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from '../database/sequelize.js';

await sequelize.authenticate();

const [configs] = await sequelize.query('SELECT nombre_variable, valor FROM configuraciones ORDER BY nombre_variable');
const [admins] = await sequelize.query("SELECT email, rol, nivel, activo FROM usuarios WHERE rol = 'super_admin'");

console.log('\n✅ CONFIGURACIONES SEMBRADAS:');
configs.forEach(c => console.log(`   ${c.nombre_variable}: ${c.valor}`));

console.log('\n✅ ADMINISTRADORES:');
admins.forEach(a => console.log(`   ${a.email} | rol: ${a.rol} | nivel: ${a.nivel} | activo: ${a.activo}`));

if (!configs.length) console.log('   ⚠️  Sin configuraciones — ejecuta npm run seed:dev');
if (!admins.length)  console.log('   ⚠️  Sin admins — ejecuta npm run seed:dev');

await sequelize.close();

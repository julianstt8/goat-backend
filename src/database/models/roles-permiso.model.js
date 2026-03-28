import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { TIPO_ROL } from './usuario.model.js';

export const RolesPermiso = sequelize.define('RolesPermiso', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rol: {
    type: DataTypes.ENUM(...Object.values(TIPO_ROL)),
    allowNull: false
  },
  permiso: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'roles_permisos',
  timestamps: false
});

export function associate(models) {
  // Sin asociaciones directas — se consulta por rol
}

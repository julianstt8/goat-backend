import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Configuracion = sequelize.define('Configuracion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_variable: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  valor: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ultima_actualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'configuraciones',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['nombre_variable'], name: 'configuraciones_nombre_variable_unique' }
  ]
});

export function associate(models) {}

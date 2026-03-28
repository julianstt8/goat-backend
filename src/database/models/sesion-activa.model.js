import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const SesionActiva = sequelize.define('SesionActiva', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'usuarios', key: 'id' },
    onDelete: 'CASCADE'
  },
  token_refresh: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  expira_en: {
    type: DataTypes.DATE,
    allowNull: false
  },
  creado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'sesiones_activas',
  timestamps: false
});

export function associate(models) {
  SesionActiva.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });
}

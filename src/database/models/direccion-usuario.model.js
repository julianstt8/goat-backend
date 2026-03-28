import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const DireccionUsuario = sequelize.define('DireccionUsuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'usuarios', key: 'id' },
    onDelete: 'CASCADE'
  },
  ciudad: {
    type: DataTypes.STRING(50),
    defaultValue: 'Medellín'
  },
  direccion_completa: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  indicaciones_entrega: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  es_principal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'direcciones_usuario',
  timestamps: false
});

export function associate(models) {
  DireccionUsuario.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });
}

import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Wishlist = sequelize.define('Wishlist', {
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
  referencia: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fecha_agregado: {
     type: DataTypes.DATE,
     defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'wishlist',
  timestamps: false
});

export function associate(models) {
  Wishlist.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'usuario'
  });
}

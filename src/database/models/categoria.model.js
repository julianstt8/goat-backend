import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Categoria = sequelize.define('Categoria', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  margen_base: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.20
  },
  cargo_libra_usd: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 2.00
  }
}, {
  tableName: 'categorias',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['nombre'], name: 'categorias_nombre_unique' }
  ]
});

export function associate(models) {
  Categoria.hasMany(models.Producto, {
    foreignKey: 'categoria_id',
    as: 'productos'
  });
}

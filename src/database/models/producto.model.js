import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    references: { model: 'categorias', key: 'id' }
  },
  referencia: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  precio_compra_usd: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  peso_libras: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1.0
  },
  talla: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  en_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  vendido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  es_serializado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  stock_disponible: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  precio_venta_cop: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  trm_compra: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'productos',
  timestamps: false
});

export function associate(models) {
  Producto.belongsTo(models.Categoria, {
    foreignKey: 'categoria_id',
    as: 'categoria'
  });
  Producto.hasOne(models.Pedido, {
    foreignKey: 'producto_id',
    as: 'pedido'
  });
}

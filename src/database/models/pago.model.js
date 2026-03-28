import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Pago = sequelize.define('Pago', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  pedido_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'pedidos', key: 'id' },
    onDelete: 'CASCADE'
  },
  monto_cop: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  fecha_pago: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  metodo_pago: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  tipo_abono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  comprobante_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pagos',
  timestamps: false,
  indexes: [
    { name: 'idx_pagos_pedido', fields: ['pedido_id'] }
  ]
});

export function associate(models) {
  Pago.belongsTo(models.Pedido, {
    foreignKey: 'pedido_id',
    as: 'pedido'
  });
}

import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const STATUS_PEDIDO = {
  PENDIENTE: 'pendiente',
  COMPRADO: 'comprado',
  EN_CASILLERO: 'en_casillero',
  EN_TRANSITO: 'en_transito',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado'
};

export const Pedido = sequelize.define('Pedido', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'usuarios', key: 'id' }
  },
  producto_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'productos', key: 'id' }
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado_logistico: {
    type: DataTypes.ENUM(...Object.values(STATUS_PEDIDO)),
    defaultValue: STATUS_PEDIDO.PENDIENTE
  },
  precio_venta_cop: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  trm_utilizada: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  costo_total_usd: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  fecha_compra: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  fecha_entrega_real: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  creado_por: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' }
  },
  modificado_por: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' }
  }
}, {
  tableName: 'pedidos',
  timestamps: false,
  indexes: [
    { name: 'idx_pedidos_tracking', fields: ['tracking_number'] }
  ]
});

export function associate(models) {
  Pedido.belongsTo(models.Usuario, {
    foreignKey: 'usuario_id',
    as: 'cliente'
  });
  Pedido.belongsTo(models.Usuario, {
    foreignKey: 'creado_por',
    as: 'vendedor'
  });
  Pedido.belongsTo(models.Usuario, {
    foreignKey: 'modificado_por',
    as: 'modificador'
  });
  Pedido.belongsTo(models.Producto, {
    foreignKey: 'producto_id',
    as: 'producto'
  });
  Pedido.hasMany(models.Pago, {
    foreignKey: 'pedido_id',
    as: 'pagos'
  });
}

import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const TIPO_GASTO = {
  MARKETING: 'marketing',
  LOGISTICA: 'logistica',
  IMPUESTOS: 'impuestos',
  OPERATIVO: 'operativo',
  PERSONAL: 'personal'
};

export const GastoOperativo = sequelize.define('GastoOperativo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  monto_cop: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  categoria: {
    type: DataTypes.ENUM(...Object.values(TIPO_GASTO)),
    defaultValue: TIPO_GASTO.OPERATIVO
  },
  fecha_gasto: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  registrado_por: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' }
  }
}, {
  tableName: 'gastos_operativos',
  timestamps: false
});

export function associate(models) {
  GastoOperativo.belongsTo(models.Usuario, {
    foreignKey: 'registrado_por',
    as: 'registrador'
  });
}

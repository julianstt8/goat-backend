import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const TIPO_ROL = {
  SUPER_ADMIN: 'super_admin',
  VENDEDOR: 'vendedor',
  CLIENTE_VIP: 'cliente_vip',
  CLIENTE_STANDARD: 'cliente_standard'
};

export const NIVEL_HYPE = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  DIAMOND: 'diamond'
};

export const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  nombre_completo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { isEmail: true }
  },
  // NULL = cliente sin acceso a plataforma (solo para registro de ventas)
  // NOT NULL = usuario con credenciales activas en la plataforma
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  rol: {
    type: DataTypes.ENUM(...Object.values(TIPO_ROL)),
    defaultValue: TIPO_ROL.CLIENTE_STANDARD
  },
  nivel: {
    type: DataTypes.ENUM(...Object.values(NIVEL_HYPE)),
    defaultValue: NIVEL_HYPE.BRONZE
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ultima_sesion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['email'], name: 'usuarios_email_unique' },
    { unique: true, fields: ['telefono'], name: 'usuarios_telefono_unique' },
    { fields: ['rol'], name: 'idx_usuarios_rol' }
  ]
});

export function associate(models) {
  Usuario.hasMany(models.Pedido, {
    foreignKey: 'usuario_id',
    as: 'pedidos'
  });
  Usuario.hasMany(models.Pedido, {
    foreignKey: 'creado_por',
    as: 'pedidos_registrados'
  });
  Usuario.hasMany(models.Pedido, {
    foreignKey: 'modificado_por',
    as: 'pedidos_modificados'
  });
  Usuario.hasMany(models.SesionActiva, {
    foreignKey: 'usuario_id',
    as: 'sesiones'
  });
  Usuario.hasMany(models.GastoOperativo, {
    foreignKey: 'registrado_por',
    as: 'gastos_registrados'
  });
  Usuario.hasMany(models.DireccionUsuario, {
    foreignKey: 'usuario_id',
    as: 'direcciones'
  });
}

-- ============================================================
-- SCRIPT DE LIMPIEZA v2.1: Elimina todo y prepara la BD
-- para el esquema GOAT v2.1 (Final)
-- ============================================================
-- ADVERTENCIA: Este script elimina TODA la data existente.
-- ============================================================

-- 1. Eliminar vistas
DROP VIEW IF EXISTS vista_deudores;

-- 2. Eliminar tablas en orden correcto (respetando FK)
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS gastos_operativos CASCADE;
DROP TABLE IF EXISTS gastos CASCADE;
DROP TABLE IF EXISTS roles_permisos CASCADE;
DROP TABLE IF EXISTS direcciones_usuario CASCADE;
DROP TABLE IF EXISTS sesiones_activas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS configuraciones CASCADE;

-- 3. Eliminar todos los ENUMs (v1 y v2)
DROP TYPE IF EXISTS tipo_rol CASCADE;
DROP TYPE IF EXISTS nivel_hype CASCADE;
DROP TYPE IF EXISTS status_pedido CASCADE;
DROP TYPE IF EXISTS status_pago CASCADE;
DROP TYPE IF EXISTS tipo_gasto CASCADE;
DROP TYPE IF EXISTS rol_usuario CASCADE;
DROP TYPE IF EXISTS "enum_usuarios_rol" CASCADE;
DROP TYPE IF EXISTS "enum_usuarios_nivel" CASCADE;
DROP TYPE IF EXISTS "enum_pedidos_estado_logistico" CASCADE;
DROP TYPE IF EXISTS "enum_pedidos_estado_pago" CASCADE;
DROP TYPE IF EXISTS "enum_gastos_categoria" CASCADE;
DROP TYPE IF EXISTS "enum_gastos_operativos_categoria" CASCADE;
DROP TYPE IF EXISTS "enum_roles_permisos_rol" CASCADE;

-- 4. Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Reinicia el servidor: npm run dev
-- Luego ejecuta los seeders: npm run seed:dev
-- Seeders:
--   01_configuraciones → TRM, envíos, IVA + vista_deudores
--   02_admin_inicial   → Usuario super_admin inicial
-- ============================================================

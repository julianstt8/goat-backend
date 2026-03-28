# Plantilla API – Esqueleto Inicial

## Descripción

API REST en Node.js (LTS 22) con Express y Sequelize conectada a MySQL.
Incluye configuración inicial, estructura de carpetas y rutas base.

---

## Tecnologías

- **Node.js** LTS 22
- **Express** 4
- **Sequelize** 6
- **MySQL** 8
- **dotenv**
- **nodemon** (desarrollo)

---

## Estructura del proyecto

```
plantilla-api/
├─ src/
│  ├─ config/
│  │  └─ env.js
│  ├─ database/
│  │  ├─ sequelize.js
│  │  └─ models/
│  ├─ routes/
│  │  ├─ index.routes.js
│  │  └─ health.routes.js
│  ├─ controllers/
│  │  ├─ root.controller.js
│  │  └─ health.controller.js
│  ├─ services/
│  ├─ middlewares/
│  ├─ app.js
│  └─ server.js
├─ .env.example
├─ package.json
├─ nodemon.json
├─ Dockerfile
└─ docker-compose.yml
```

---

## Instalación

```bash
# Clonar el repositorio
git clone <repo_url>
cd goat-api

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev
```

---

## Variables de entorno

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=goat
DB_USER=root
DB_PASS=changeme
DB_LOGGING=false
```

---

## Scripts

- `npm run dev`: Inicia el servidor en modo desarrollo con nodemon
- `npm start`: Inicia el servidor en modo producción

---

## Rutas iniciales

### GET /api

Devuelve el texto plano:

```
goat
```

### GET /api/health

Verifica la conexión a MySQL y responde:

```json
{
  "app": "ok",
  "db": "ok",
  "timestamp": "2025-08-11T12:00:00.000Z"
}
```

---

## Despliegue con Docker

```bash
docker compose up --build
```

El servicio API estará disponible en `http://localhost:3000`.

---

## Futuras mejoras

- Logger (pino/winston)
- CORS
- Autenticación JWT
- Migraciones y seeders con sequelize-cli
- Tests automáticos

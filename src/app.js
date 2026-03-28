import express from 'express';
import apiRoutes from './routes/index.routes.js';
import healthRoutes from './routes/health.routes.js';
import env from './config/env.js';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Swagger solo en desarrollo
import swaggerUi from 'swagger-ui-express';
import { buildSwaggerSpec } from './docs/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

let corsOptions = {};

if (env.nodeEnv === 'development') {
  corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  };
} else {
  corsOptions = {
    origin: ["https://mi-frontend.com", "https://admin.mi-frontend.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  };
}

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Prefijo de API
app.use('/api', apiRoutes);
app.use('/api/health', healthRoutes);

// Swagger UI (solo dev)
if (env.nodeEnv === 'development') {
  const swaggerSpec = buildSwaggerSpec();
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  console.log(`📚 Swagger UI activo en http://localhost:${env.port}/docs`);
}

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ error: message });
});

export default app;

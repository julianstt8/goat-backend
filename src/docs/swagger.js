import swaggerJSDoc from 'swagger-jsdoc';
import env from '../config/env.js';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Plantilla Tactika API',
    version: '0.1.0',
    description: 'Documentación de la API (solo en desarrollo).'
  },
  servers: [
    { url: `${env.host}:${env.port}/api`, description: 'Desarrollo local' },
    { url: `${env.hostRemoto}/api`, description: 'Desarrollo remoto' },

  ],
  components: {
    securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          app: { type: 'string', example: 'ok' },
          db: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
    }
  }
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.js',
    './src/controllers/**/*.js'
  ]
};

export function buildSwaggerSpec() {
  return swaggerJSDoc(swaggerOptions);
}

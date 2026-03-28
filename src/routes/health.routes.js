import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check de la API y base de datos
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Estado de la app y DB.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', getHealth);

export default router;

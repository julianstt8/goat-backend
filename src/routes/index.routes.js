import { Router } from 'express';
import { getRootName } from '../controllers/root.controller.js';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import expenseRoutes from './expense.routes.js';
import calculateRoutes from './calculate.routes.js';
import configRoutes from './config.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

/**
 * @openapi
 * /:
 *   get:
 *     summary: Nombre de la API
 *     tags: [Root]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', getRootName);

// Auth
router.use('/auth', authRoutes);

// Usuarios y clientes
router.use('/users', userRoutes);

// Catálogo
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);

// Pedidos + pagos anidados
router.use('/orders', orderRoutes);
router.use('/orders/:id/payments', paymentRoutes);

// Finanzas
router.use('/expenses', expenseRoutes);

// Cotizador (público)
router.use('/calculate', calculateRoutes);

// Configuraciones del sistema (solo super_admin)
router.use('/config', configRoutes);

// Reportes y vistas
router.use('/reports', reportRoutes);

export default router;

import { Router } from 'express';
import { listOrders, getOrderBalance, createOrder, updateOrderStatus } from '../controllers/order.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Pedidos
 *     description: Gestión de pedidos y logística
 */

const router = Router();

router.use(authRequired); // Todas las rutas requieren token

router.get('/', listOrders);
router.post('/', requireRoles('super_admin', 'vendedor'), createOrder);
router.get('/:id/balance', getOrderBalance);
router.patch('/:id', requireRoles('super_admin', 'vendedor'), updateOrderStatus);

export default router;

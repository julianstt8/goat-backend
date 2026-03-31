import { Router } from 'express';
import { listOrders, getOrderBalance, createOrder, createBatchOrder, updateOrderStatus, deleteOrder } from '../controllers/order.controller.js';
import { authRequired, requireRoles, optionalAuth } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Pedidos
 *     description: Gestión de pedidos y logística
 */

const router = Router();

// Ruta de creación masiva permitida para invitados y usuarios logueados
router.post('/batch', optionalAuth, createBatchOrder);

router.use(authRequired); // A partir de aquí requieren token
router.get('/', listOrders);
router.post('/', requireRoles('super_admin', 'vendedor'), createOrder);
router.get('/:id/balance', getOrderBalance);
router.patch('/:id', requireRoles('super_admin', 'vendedor'), updateOrderStatus);
router.delete('/:id', requireRoles('super_admin', 'vendedor'), deleteOrder);

export default router;

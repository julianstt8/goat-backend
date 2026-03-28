import { Router } from 'express';
import { listPayments, createPayment, deletePayment } from '../controllers/payment.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Pagos
 *     description: Abonos y gestión de cartera por pedido
 */

// Montado bajo /orders/:id/payments — el param :id llega como orderId
const router = Router({ mergeParams: true });
router.use(authRequired);

router.get('/', listPayments);
router.post('/', requireRoles('super_admin', 'vendedor'), createPayment);
router.delete('/:paymentId', requireRoles('super_admin'), deletePayment);

export default router;

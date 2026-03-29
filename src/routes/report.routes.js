import { Router } from 'express';
import { getDebtors } from '../controllers/report.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Protegida para super_admin y vendedores
router.use(authRequired);
router.use(requireRoles('super_admin', 'vendedor'));

router.get('/debtors', getDebtors);

export default router;

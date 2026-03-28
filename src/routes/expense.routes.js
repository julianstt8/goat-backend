import { Router } from 'express';
import { createExpense, listExpenses } from '../controllers/expense.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Gastos
 *     description: Contabilidad de gastos operativos
 */

const router = Router();

router.use(authRequired);
router.use(requireRoles('super_admin', 'vendedor'));

router.get('/', listExpenses);
router.post('/', createExpense);

export default router;

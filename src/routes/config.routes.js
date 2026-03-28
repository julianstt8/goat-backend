import { Router } from 'express';
import { listConfig, updateConfig, createConfig } from '../controllers/config.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Configuraciones
 *     description: Variables del sistema (TRM offset, tarifas de envío, IVA)
 */

const router = Router();
router.use(authRequired);
router.use(requireRoles('super_admin'));

router.get('/', listConfig);
router.post('/', createConfig);
router.put('/:nombre_variable', updateConfig);

export default router;

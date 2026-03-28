import { Router } from 'express';
import { listUsers, getUserById, createUser, updateUser, deactivateUser, addAddress } from '../controllers/user.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Usuarios
 *     description: Gestión de usuarios y clientes
 */

const router = Router();
router.use(authRequired);

router.get('/', listUsers);
router.post('/', requireRoles('super_admin', 'vendedor'), createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', requireRoles('super_admin'), deactivateUser);
router.post('/:id/addresses', addAddress);

export default router;

import { Router } from 'express';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Categorias
 *     description: Categorías de productos con margen y cargo por libra
 */

const router = Router();
router.use(authRequired);

router.get('/', listCategories);
router.post('/', requireRoles('super_admin'), createCategory);
router.patch('/:id', requireRoles('super_admin'), updateCategory);
router.delete('/:id', requireRoles('super_admin'), deleteCategory);

export default router;

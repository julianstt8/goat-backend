import { Router } from 'express';
import { listProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Productos
 *     description: Gestión de productos e inventario
 */

const router = Router();
router.use(authRequired);

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', requireRoles('super_admin', 'vendedor'), createProduct);
router.patch('/:id', requireRoles('super_admin', 'vendedor'), updateProduct);
router.delete('/:id', requireRoles('super_admin'), deleteProduct);

export default router;

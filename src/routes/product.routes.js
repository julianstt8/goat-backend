import { Router } from 'express';
import { listProducts, getProductById, createProduct, createBatchProduct, updateProduct, deleteProduct, recalculateStockPrices } from '../controllers/product.controller.js';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';

/**
 * @openapi
 * tags:
 *   - name: Productos
 *     description: Gestión de productos e inventario
 */

const router = Router();

// Acceso público para el catálogo
router.get('/', listProducts);
router.get('/:id', getProductById);

// Rutas protegidas para gestión
router.use(authRequired);
router.post('/', requireRoles('super_admin', 'vendedor'), createProduct);
router.post('/batch', requireRoles('super_admin', 'vendedor'), createBatchProduct);
router.patch('/:id', requireRoles('super_admin', 'vendedor'), updateProduct);
router.post('/recalculate', requireRoles('super_admin'), recalculateStockPrices);
router.delete('/:id', requireRoles('super_admin'), deleteProduct);

export default router;

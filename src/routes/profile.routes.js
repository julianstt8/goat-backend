import { Router } from 'express';
import * as profileController from '../controllers/user-profile.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas requieren login
router.use(authRequired);

/** Perfil y Tallas */
router.get('/me', profileController.getProfile);
router.patch('/me', profileController.updateProfile);

/** Direcciones */
router.get('/addresses', profileController.listAddresses);
router.post('/addresses', profileController.addAddress);
router.delete('/addresses/:id', profileController.deleteAddress);

/** Wishlist */
router.get('/wishlist', profileController.listWishlist);
router.post('/wishlist', profileController.addToWishlist);
router.delete('/wishlist/:id', profileController.removeFromWishlist);

/** Pagos */
router.get('/payments', profileController.listPayments);

export default router;

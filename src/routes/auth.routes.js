import { Router } from 'express';
import { login, register, me } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Autenticación de usuarios
 */

router.post('/login', login);
router.post('/register', register);
router.get('/me', authRequired, me);

export default router;

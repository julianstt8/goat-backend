import { Router } from 'express';
import { getTrm, refreshTrm, calculatePrice, calculateBatch } from '../controllers/calculate.controller.js';

const router = Router();

// TRM en tiempo real (público — no requiere auth)
router.get('/trm', getTrm);
router.post('/trm/refresh', refreshTrm);

// Cotizador (público)
router.post('/', calculatePrice);
router.post('/batch', calculateBatch);

export default router;

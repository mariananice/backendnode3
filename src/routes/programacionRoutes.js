import express from 'express'

import { getProgramacionAnual } from '../controllers/programacionController.js';
import { getProgramacionBase } from '../controllers/programacionController.js';
import { getProgramacionResumenSemanal } from '../controllers/programacionController.js';

const router = express.Router();

router.get('/base', getProgramacionBase);
router.get('/anual', getProgramacionAnual);
router.get('/resumen-semanal', getProgramacionResumenSemanal);

export default router
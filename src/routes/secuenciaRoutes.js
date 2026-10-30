import express from 'express'
import {
    getSecuenciaPorFecha,
    getSecuenciaSemana
} from '../controllers/secuenciaController.js'

const router = express.Router();

router.get(
    '/',
    getSecuenciaPorFecha
);

router.get(
    '/semana',
    getSecuenciaSemana
);

export default router
import express from 'express'

import {
    obtenerPlaneacion,
    crearPlaneacion,
    obtenerPartes,
    eliminarPlaneacion
} from '../controllers/planeacionController.js';

const router = express.Router();

router.get(
    '/partes',
    obtenerPartes
);

router.get(
    '/',
    obtenerPlaneacion
);

router.post(
    '/',
    crearPlaneacion
);

router.delete(
    '/:id',
    eliminarPlaneacion
);

export default router
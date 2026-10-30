import express from 'express'

import {
    obtenerCspc,
    obtenerCspcId,
    crearCspc,
    actualizarCspc,
    eliminarCspc
} from '../controllers/cspcController.js'

const router = express.Router();

router.get('/', obtenerCspc);
router.get('/:id', obtenerCspcId);
router.post('/', crearCspc);
router.put('/:id', actualizarCspc);
router.delete('/:id', eliminarCspc);

export default router
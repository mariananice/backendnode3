import express from 'express'
import multer from 'multer'

import {
    getDatos,
    actualizarDato,
    checkDatos
} from '../controllers/datosController.js'

import {
    importarDatos
} from '../controllers/datosImportController.js'

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

router.get('/', getDatos);

router.get('/check', checkDatos);

router.post(
    '/importar',
    upload.single('archivo'),
    importarDatos
);

router.patch(
    '/:id_datos',
    actualizarDato
);

export default router
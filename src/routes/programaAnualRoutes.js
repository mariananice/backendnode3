import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

import {
    validarProgramaAnual,
    confirmarProgramaAnual,
    listarCargasPrograma,
    activarCargaPrograma
} from '../controllers/programaAnualController.js';

const router = express.Router();

const uploadDirectory = path.resolve('uploads/programa-anual');

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname);
        const baseName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9_-]/g, '_');

        callback(
            null,
            `${Date.now()}-${baseName}${extension}`
        );
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    },

    fileFilter: (_req, file, callback) => {
        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        if (!['.xls', '.xlsx'].includes(extension)) {
            return callback(
                new Error('Solo se permiten archivos .xls y .xlsx')
            );
        }

        callback(null, true);
    }
});

router.get(
    '/cargas',
    listarCargasPrograma
);

router.post(
    '/validar',
    upload.single('archivo'),
    validarProgramaAnual
);

router.post(
    '/:id_carga/confirmar',
    confirmarProgramaAnual
);

router.post(
    '/:id_carga/activar',
    activarCargaPrograma
);

export default router
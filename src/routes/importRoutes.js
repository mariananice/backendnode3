import { Router } from 'express'
import upload from '../middlewares/upload.js'
import {
    importCspcExcel,
    importParteExcel,
    importDohExcel,
    previewReqbodyExcel
} from '../controllers/importController.js'

const router = Router();

router.post('/cspc/import', upload.single('archivo'), importCspcExcel);
router.post('/parte/import', upload.single('archivo'), importParteExcel);
router.post('/doh/import', upload.single('archivo'), importDohExcel);
router.post('/reqbody/preview', upload.single('archivo'), previewReqbodyExcel);

export default router
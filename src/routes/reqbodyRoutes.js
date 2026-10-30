import express from 'express'
import multer from 'multer'
import {
  importReqbodyExcel,
  getReqbody,
  generarReqbodyDiario,
  getReqbodyDiarioSemana,
  getReqbodyResumenSemana
} from '../controllers/reqbodyController.js'
//import upload from '../middlewares/upload.js' 
//import { uploadReqBody } from '../controllers/reqbodyController.js'

const router = express.Router()
const upload = multer({ dest: 'uploads/' });

router.post('/import', upload.single('archivo'), importReqbodyExcel) // Excel de Body a reqbody_import
router.get('/', getReqbody); // vista importada
router.post('/generar-diario', generarReqbodyDiario); // Generar diario en tabla reqbdoy a partir de reqbody_import
router.get('/diario', getReqbodyDiarioSemana); // consultar diario por semana/año (Para Estampado)
router.get('/resumen', getReqbodyResumenSemana); // consultar resumen por semana

export default router

/*import express from 'express';

const router = express.Router();

// tus rutas aquí
router.get('/', (req, res) => {
  res.json({ mensaje: 'ok' });
});

export default router; */
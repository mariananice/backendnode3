import { Router } from 'express'
import { crearProduccion, obtenerProduccion } from '../controllers/produccionController.js'

const router = Router();

router.get('/', obtenerProduccion);
router.post('/', crearProduccion);

export default router
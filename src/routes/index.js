import { Router } from 'express'
import userRoutes from './userRoutes.js'
import cspcRoutes from './cspcRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import parteRoutes from './parteRoutes.js'
import planeacionRoutes from './planeacionRoutes.js'
import produccionRoutes from './produccionRoutes.js'
import programacionRoutes from './programacionRoutes.js'
import reqbodyRoutes from './reqbodyRoutes.js'
import importRoutes from './importRoutes.js'

const router = Router();

// Ruta de prueba: GET /api/ping
router.get('/ping', (req, res) => {
    res.json({ ok: true, 
               mensaje: 'Backend responde correctamente'
            });
})

router.get('/', (req, res) => {
    res.json({ message: 'Servidor API' });
});

router.use('/usuarios', userRoutes);
router.use('/cspc', cspcRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/partes', parteRoutes);
router.use('/planeacion', planeacionRoutes);
router.use('/produccion', produccionRoutes);
router.use('/programacion', programacionRoutes);
router.use('/reqbody', reqbodyRoutes);
router.use('/import', importRoutes);

export default router
import { Router } from 'express'
import userRoutes from './userRoutes.js'
//import dashboardRoutes from './dashboardRoutes.js'

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
//router.use('/dashboard', dashboardRoutes);

export default router;
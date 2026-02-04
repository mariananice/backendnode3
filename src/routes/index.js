import { Router } from 'express'
import userRoutes from './userRoutes.js'

const router = Router();

router.get('/', (req, res) => {
    res.json({ message: 'Servidor API' });
});

router.use('/usuarios', userRoutes);

export default router;
import express from 'express'
import { obtenerPartes, crearParte } from '../controllers/parteController.js'
//import { getDefaultHighWaterMark } from 'nodemailer/lib/xoauth2'

const router = express.Router();


router.get('/', obtenerPartes);
router.post('/', crearParte);

export default router

/*import express from 'express';

const router = express.Router();

// tus rutas aquí
router.get('/', (req, res) => {
  res.json({ mensaje: 'ok' });
});

export default router; */
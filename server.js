import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import helmet from 'helmet';

import router from './src/routes/index.js'
import errorMiddleware from './src/middlewares/errorMiddleware.js'

dotenv.config();

const app = express();

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

app.use(helmet());
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(_dirname, '..', 'FRONTENDNODE')));

app.use('/api', router);
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import router from './src/routes/index.js'
import errorMiddleware from './src/middlewares/errorMiddleware.js'

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', router);
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
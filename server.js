import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './src/routes/index.js'
import reqbodyRoutes from './src/routes/reqbodyRoutes.js'
import programacionRoutes from './src/routes/programacionRoutes.js'
import planeacionRoutes from './src/routes/planeacionRoutes.js'
import produccionRoutes from './src/routes/produccionRoutes.js'
import parteRoutes from './src/routes/parteRoutes.js'
import cspcRoutes from './src/routes/cspcRoutes.js'
import dashboardRoutes from './src/routes/dashboardRoutes.js'
import userRoutes from './src/routes/userRoutes.js'
import errorMiddleware from './src/middlewares/errorMiddleware.js'
import programaAnualRoutes from './src/routes/programaAnualRoutes.js'
import secuenciaRoutes from './src/routes/secuenciaRoutes.js'
import datosRoutes from './src/routes/datosRoutes.js'

dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'FRONTENDNODE')))

app.use('/api', routes)
app.use('/api/reqbody', reqbodyRoutes)
app.use('/api/programacion', programacionRoutes)
app.use('/api/planeacion', planeacionRoutes)
app.use('/api/produccion', produccionRoutes)
app.use('/api/parte', parteRoutes)
app.use('/api/cspc', cspcRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/users', userRoutes)
app.use('/api/programacion/anual', programaAnualRoutes)
app.use('/api/secuencia', secuenciaRoutes)
app.use('/api/datos', datosRoutes)
app.use(errorMiddleware)

const PORT = parseInt(process.env.PORT, 10) || 3300
const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Error: el puerto ${PORT} ya está en uso. Cierra la otra instancia o cambia el puerto en tu frontend/backend.`)
        process.exit(1)
    }

    console.error('Error al iniciar el servidor:', error)
    process.exit(1)
})
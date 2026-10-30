import { Router } from 'express'
import DashboardController from '../controllers/dashboardController.js'
import upload from '../middlewares/upload.js'

const router = Router()
const dashboardController = new DashboardController();

router.post(
    '/upload-excel',
    upload.single('archivo'),
    dashboardController.uploadExcel.bind(dashboardController)
);

//router.get('/', obtenerDashboard);

export default router

/*import { Router } from 'express'
import DashboardController from '../controllers/dashboardController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'

const router = Router();
const controller = new DashboardController();

router.get('/', verifyToken, controller.getDashboard.bind(controller));

export default router;*/
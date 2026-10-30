import { Router } from 'express'
import UserController from '../controllers/userController.js'
import { verifyToken } from '../middlewares/authMiddleware.js'
import { canEditUser } from '../middlewares/permissionMiddleware.js'
import { isAdmin } from '../middlewares/roleMiddleware.js'
//import authMiddleware from '../middlewares/authMiddleware.js'

const router = Router();
const userController = new UserController();

router.post('/create', userController.create.bind(userController));
router.post('/login', userController.login.bind(userController));

router.put('/:id', verifyToken, canEditUser, userController.update.bind(userController));
router.delete('/:id', verifyToken, isAdmin, userController.delete.bind(userController));

router.get('/', verifyToken, isAdmin, userController.getAll.bind(userController));

router.post('/forgot-password', userController.forgotPassword.bind(userController));
router.post('/reset-password', userController.resetPassword.bind(userController));

router.post('/resend-reset-code', userController.resendResetCode.bind(userController));

//router.get('/pendientes', verifyToken, isAdmin, userController.getPendingUsers.bind(userController));
//router.put('/aprobar/:id', verifyToken, isAdmin, userController.approveUser.bind(userController));

//router.get("/me", authMiddleware, (req, res) => {
    //res.json({
        //message: 'Acceso permitido',
        //user: req.user
    //});
//});

export default router
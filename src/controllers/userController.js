import jwt from 'jsonwebtoken'

import UserService from '../services/userService.js'

export default class UserController {
    constructor() {
        this.userService = new UserService();
    }

    async create(req, res, next) {
        try {
            console.log(req.body);

            const { GMIN, nombre, email, password, rol } = req.body;

            if (!GMIN || !nombre || !password) {
                return res.status(400).json({ message: 'Datos incompletos' });
            }

            const user = await this.userService.create({
                GMIN,
                nombre,
                email,
                password,
                rol
            });

            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        console.log('BODY LOGIN:', req.body);
        try {
            const { GMIN, password } = req.body;

            if (!GMIN || !password) {
                return res.status(400).json({ message: 'Datos incompletos' });
            }

            const result = await this.userService.login(GMIN, password);
            res.json(result);
        } catch (error) {
            next(error);
        }

        //const token = jwt.sign(
            //{
                //id_usuario: usuario.id_usuario,
                //rol: user.rol,
                //GMIN: user.GMIN
            //},
            //process.env.JWT_SECRET,
            //{ expiresIn: '1h' }
        //);
    }

    async approveUser(req, res, next) {
        try {
            const { id } = req.params;
            await this.userService.approveUser(id, req.user.id_usuario);
            res.json({ message: 'Usuario aprobado correctamente' });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            await this.userService.update(id, req.body);
            res.json({ message: 'Usuario actualizado correctamente' });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await this.userService.delete(id);
            res.json({ message: 'Usuario eliminado correctamente' });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            await this.userService.forgotPassword(email);
            res.json({ message: 'Código enviado al correo' });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email, code, password } = req.body;
            await this.userService.resetPassword(email, code, password);
            res.json({ message: 'Contraseña actualizada correctamente' });
        } catch (error) {
            next(error);
        }
    }

    async resendResetCode(req, res, next) {
        try {
            const { email } = req.body;
            await this.userService.resendResetCode(email);
            res.json({ message: 'Código reenviado correctamente' });
        } catch (error) {
            next(error);
        }
    }
}
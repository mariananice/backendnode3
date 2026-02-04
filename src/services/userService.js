import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import UserRepository from '../repositories/userRepository.js'
import { sendResetCode } from '../utils/mailer.js'
//import generateToken from '../utils/generateToken.js'

export default class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async create({ GMIN, nombre, email, password, rol }) {
        const exists = await this.userRepository.findByGMIN(GMIN);
        if(exists) {
            throw { status: 409, message: 'El usuario ya existe' };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return await this.userRepository.create({
            GMIN,
            nombre,
            email,
            passwordHash,
            rol
        });
    }

    async login(GMIN, password) {
        const user = await this.userRepository.findByGMIN(GMIN);
        if (!user) {
            throw { status: 401, message: 'Credenciales inválidas' };
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw { status: 401, message: 'Credenciales inválidas' };
        }

        const token = jwt.sign(
            { id: user.id_usuario, GMIN: user.GMIN, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h'}
        );

        return {
            token,
            user: {
                id: user.id_usuario,
                GMIN: user.GMIN,
                nombre: user.nombre_usuario,
                email: user.email,
                rol: user.rol
            }
        };
    }

    async update(id, { nombre, email, password, rol }) {
        const user = await this.userRepository.findById(id);
        if(!user) {
            throw { status: 404, message: 'Usuario no encontrado' };
        }

        const data = {};

        if (nombre) data.nombre_usuario = nombre;
        if (email) data.emeail = email;
        if (rol) data.rol = rol;
        if (password) {
            data.password_hash = await bcrypt.hash(password, 10);
        }

        await this.userRepository.update(id, data);
    }

    async delete(id) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw { status: 404, message: 'Usuario no encontrado' };
        }

        await this.userRepository.delete(id);
    }

    async forgotPassword(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw { status: 404, message: 'Usuario no encontrado' };
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 10 * 60 * 1000);

        await this.userRepository.saveResetCode(
            user.id_usuario,
            code,
            expiration
        );

        await sendResetCode(email, code);
    }

    async resetPassword(email, code, newPassword) {
        const user = await this.userRepository.findByResetCode(email, code);
        if (!user) {
            throw { status: 400, message: 'Código inválido o expirado' };
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await this.userRepository.update(user.id_usuario, {
            password_hash: passwordHash
        });

        await this.userRepository.clearResetCode(user.id_usuario);
    }

    async resendResetCode(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw { status: 404, message: 'Usuario no encontrado' };
        }

        const resetInfo = await this.userRepository.getResetCodeInfo(user.id_usuario);

        // Si existe el código y aún no expira
        if ( 
            resetInfo?.reset_code &&
            new Date(resetInfo.rest_code_exp) > newDate()
        ) {
            throw {
                status: 400,
                message: 'El código aún es válido, revisa tu correo'
            };
        }

        // Generar nuevo código
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 10 * 60 * 1000);
        
        await this.userRepository.saveResetCode(
            user.id_usuario,
            newCode,
            expiration
        );

        await sendResetCode(email, newCode);
    }
}

/*
async create({ GMIN, nombre, email, password, rol }) {
    const exists = await this.userRepository.findByGMIN(GMIN);
    if (exists) {
        throw { status: 409, message: 'El usuario ya existe' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await this.userRepository.create({
        GMIN,
        nombre,
        email,
        passwordHash,
        rol: rol || 'usuario'
    });

    // Notificar admin
    await notifyAdminNewUser(process.env.ADMIN_EMAIL, newUser);

    return {
        message: 'Usuario registrado. Pendiente de aprobación por el administrador'
    };
}*/
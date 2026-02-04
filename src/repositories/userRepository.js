import db from '../config/db.js'

export default class UserRepository {
    async findByGMIN(GMIN) {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE GMIN = ?', 
            [GMIN]
        );
        return rows[0];
    }

    async findById(id) {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE id_usuarios = ?',
            [id]
        );
        return rows[0];
    }

    async create({ GMIN, nombre, email, passwordHash, rol }) {
        const [result] = await db.query(
           `INSERT INTO usuarios
           (nombre_usuario, GMIN, email, password_hash, rol)
           VALUES (?, ?, ?, ?, ?)`,
           [
            nombre, 
            GMIN,
            email || null,
            passwordHash,
            rol || 'usuario'
           ] 
        );

        return {
            id: result.insertId,
            GMIN,
            nombre,
            email,
            rol: rol || 'usuario'
        };
    }

    async update(id, data) {
        const fields = [];
        const values = [];

        for (const key in data) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }

        values.push(id);

        await db.query(
            `UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario = ?`,
            values
        );
    }

    async delete(id) {
        await db.query(
            'DELETE FROM usuarios WHERE id_usuarios = ?',
            [id]
        );
    }

    async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    async saveResetCode(id, code, expiration) {
        await db.query(
            `UPDATE usuarios
            SET reset_code = ?, reset_code_exp = ?
            WHERE id_usuario = ?`,
            [code, expiration, id]
        );
    }

    async findByResetCode(email, code) {
        const [rows] = await db.query(
            `SELECT * FORM usuarios
            WHERE email = ?
            AND reset_code = ?
            AND reset_code_exp > NOW()`,
            [email, code]
        );
        return rows[0];
    }

    async clearResetCode(id) {
        await db.query(
            `UPDATE usuarios
            SET reset_code = NULL,
                reset_code_exp = NULL
            WHERE id_usuario = ?`,
            [id]
        );
    }

    async getResetCodeInfo(id) {
        const [rows] = await db.query(
            `SELECT reset_code, reset_code_exp
            FROM usuarios
            WHERE id_usuario = ?`,
            [id]
        );
        return rows[0];
    }

    /*async approveUser(userId, adminId) {
        await db.query(
            `UPDATE usuarios
            SET aprobado = true,
                aprobado_por = ?,
                aprobado_en = NOW()
            WHERE id_usuario = ?`,
            [adminId, userId]
        );
    }*/

    /*async getPendingUsers() {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE aprobado = false'
        );
        return rows;
    }*/
}
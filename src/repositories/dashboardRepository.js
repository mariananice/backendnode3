/*import db from '../config/db.js'

export default class DashboardRepository {
    async countUsuarios() {
        const [rows] = await db.query(
            'SELECT COUNT(*) total FROM usuarios'
        );
        return rows[0].total;
    }

    async countPendientes() {
        const [rows] = await db.query(
            'SELECT COUNT(*) total FROM usuarios WHERE aprobado = false'
        );
        return rows[0].total;
    }

    async lastUsers(limit = 5) {
        const [rows] = await db.query(
            `SELECT nombre_usuario, created_at
            FROM usuarios
            ORDER BY created_at DESC
            LIMIT ?`,
            [limit]
        );
        return rows;
    }
}*/
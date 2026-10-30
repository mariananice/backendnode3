/*import DashboardRepository from "../repositories/dashboardRepository"

export default class DashboardService {
    constructor() {
        this.repo = new DashboardRepository();
    }

    async getDashboardData(user) {
        const [
            totalUsuarios,
            usuariosPendientes,
            ultimosUsuarios
        ] = await Promise.all([
            this.repo.countUsuarios(),
            this.repo.countPendientes(),
            this.repo.lastUsers()
        ]);

        return {
            user: {
                nombre: user.GMIN,
                rol: user.rol
            },
            status: {
                totalUsuarios,
                usuariosPendientes,
                ultimosUsuarios
            }
        };
    }
}*/

import { parseExcel } from '../utils/excelParser.js'

class DashboardService {
    leerExcel(filePath) {
        return parseExcel(filePath);
    }
}

export default DashboardService
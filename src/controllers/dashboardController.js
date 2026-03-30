/*import DashboardService from "../services/dashboardService"

export default class DashboardController {
    constructor() {
        this.service = new DashboardService();
    }

    async getDashboard(req, res, next) {
        try {
            const data = await this.service.getDashboardData(req.user);
            res.json(data);
        } catch (error) {
            next(error)
        }
    }
}*/

/*export default class DashboardController {
    async getDashboard(req, res, next) {
        try {
            res.json({
                user: {
                    nombre: req.user.nombre,
                    rol: req.user.rol
                },
                status: {
                    totalUsuarios: 0,
                    usuariosPendientes: 0,
                    notificaciones: []
                }
            });
        } catch (error) {
            next(error);
        }
    }
}*/
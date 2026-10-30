/*import db from '../config/db.js'

export const obtenerDashboard = (req, res) => {
    const query = `
        SELECT
        SUM(cantidad) AS produccion_total
        FROM produccion
        WHERE fecha = CURDATE()
    `;

    db.query(query, (err, total) => {

        const plan = `
            SELECT SUM(cantidad_planeada) AS planeado
            FROM planeacion
            WHERE fecha = CURDATE()
        `;

        db.query(plan, (err, planeado) => {
            res.json({
                produccion: total[0].produccion_total,
                planeado: planeado[0].planeado
            });
        });

    });
};*/

import fs from 'fs'
import DashboardService from '../services/dashboardService.js'

/*export const obtenerDashboard = (req, res) => {
  res.json({ message: 'Dashboard OK' });
};
*/

class DashboardController {
    constructor () {
        this.DashboardService = new DashboardService();
    }

    uploadExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    message: 'No se recibió ningún archivo'
                });
            }

            const datos = this.DashboardService.leerExcel(req.file.path);

            // opcional: borrar archivo temporal
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(200).json({
                message: 'Excel leído correctamente',
                datos
            });
        } catch (error) {
            console.error('Error al procesar Excel:', error);
            return res.status(500).json({
                message: 'Error al procesar el Excel'
            });
        }
    }
}

export default DashboardController

/*import fs from 'fs';
import DashboardService from '../services/dashboardService.js';

class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  uploadExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No se recibió ningún archivo'
        });
      }

      const datos = this.dashboardService.leerExcel(req.file.path);

      // opcional: borrar archivo temporal
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(200).json({
        message: 'Excel leído correctamente',
        datos
      });
    } catch (error) {
      console.error('Error al procesar Excel:', error);
      return res.status(500).json({
        message: 'Error al procesar el Excel'
      });
    }
  }
}

export default DashboardController;
 */
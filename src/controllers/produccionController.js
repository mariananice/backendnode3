import db from '../config/db.js'

export const crearProduccion = async (req, res) => {
    try {
        const {
            id_parte,
            linea,
            hora,
            cantidad,
            fecha
        } = req.body;

        const query = `
            INSERT INTO produccion
            (id_parte, linea, hora, cantidad, fecha)
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.query(query, [
            id_parte,
            linea,
            hora,
            cantidad,
            fecha
        ]);

        res.json({ message: 'Producción registrada' });
    } catch (error) {
        console.error('Error al crear producción:', error);
        res.status(500).json({ message: error.message });
    }
};

export const obtenerProduccion = async (req, res) => {
    try {
        const { fecha } = req.query;

        let query = 'SELECT * FROM produccion';
        let params = [];

        if (fecha) {
            query += ' WHERE fecha = ?';
            params.push(fecha);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener producción:', error);
        res.status(500).json({ message: error.message });
    }
};
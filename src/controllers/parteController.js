import db from '../config/db.js'

export const obtenerPartes = (req, res) => {
    const query = `
        SELECT
        p.id_parte,
        p.nombre_parte,
        p.numero_parte,
        p.modelo,
        p.strokes,
        p.linea,
        c.nombre_cspc
        FROM parte p
        JOIN cspc c ON p.id_cspc = c.id_cspc
    `;

    db.query(query, (err, results) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(results);
    });
};

export const obtenerParteId = (req, res) => {

    const { id } = req.params;

    db.query(
        "SELECT * FROM parte WHERE id_parte=?",
        [id],
        (err, result) => {

            if(err) return res.status(500).json(err);

            res.json(result[0]);
        }
    );
};

export const crearParte = (req, res) => {

    const {
        nombre_parte,
        id_cspc,
        numero_parte,
        modelo,
        rack_mac,
        strokes,
        linea
    } = req.body;

    const query = `
        INSERT INTO parte
        (nombre_parte,id_cspc,numero_parte,modelo,rack_mac,strokes,linea)
        VALUES (?,?,?,?,?,?,?)
    `;

    db.query(query, [
        nombre_parte,
        id_cspc,
        numero_parte,
        modelo,
        rack_mac,
        strokes,
        linea
    ], (err, result) => {
        if(err) {
            return res.status(500).json(err);
        }

        res.json({
            message: 'Parte creada',
            id:result.insertId
        });

    });
};
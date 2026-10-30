import db from '../config/db.js'

export const obtenerCspc = (req, res) => {
    
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const query = `
        SELECT * FROM cspc
        LIMIT ? OFFSET ?
    `;
    db.query(query, [limit, offset], (err, results) => {
        if (err) return res.status(500).json(err);

        res.json(results);
    });
};

export const obtenerCspcId = (req, res) => {

    const { id } = req.params;

    db.query(
        "SELECT * FROM cspc WHERE id_cspc = ?",
        [id],
        (err, results) => {

            if (err) return res.status(500).json(err);

            res.json(results[0]);
        }
    );
};

export const crearCspc = (req, res) => {
    const { numero_parte, nombre_cspc, linea, sph_cspc } = req.body;

    const query = `
        INSERT INTO cspc
        (numero_parte, nombre_cspc, linea, sph_cspc)
        VALUES(?,?,?,?)
    `;

    db.query(query,[numero_parte, nombre_cspc, linea, sph_cspc], (err, result) => {
        
        if (err) return res.status(500).json(err);

        res.json({
            message: 'CSPC creado',
            id: result.insertId
        });
    });
};

export const actualizarCspc = (req, res) => {
    const { id } = req.params;
    const { numero_parte, nombre_cspc, linea, sph_cspc } = req.body;

    const query = `
        UPDATE cspc
        SET numero_parte=?, nombre_cspc=?, linea=?, sph_cspc=?
        WHERE id_cspc=?
    `;

    db.query(query, [ numero_parte, nombre_cspc, linea, sph_cspc, id ], (err) => {
        
        if(err) return res.status(500).json(err);

        res.json({ message: 'CSPC actualizado' });
    });
};

export const eliminarCspc = (req, res) => {
    const { id } = req.params;
    
    db.query( 
        "DELETE FROM cspc WHERE id_cspc = ?",
        [id],
        (err) => {

            if(err) return res.status(500).json(err);

            res.json({ message: 'CSPC eliminado'});
        }
    );
};
import db from '../config/db.js'

export const generarProgramacion = () => {
    const query = `
        SELECT id_parte, fecha, SUM(cantidad) AS total
        FROM reqbody
        GROUP BY id_parte, fecha
    `;

    db.query(query, (err, rows) => {
        rows.forEach(row => {
            const insert = `
                INSERT INTO programacion
                (id_parte, fecha, requerimiento, cantidad_programada)
                VALUES (?,?,?,?)
            `;

            db.query(insert, [
                row.id_parte,
                row.fecha,
                row.total,
                row.total
            ]);
        });
    });
}

export const generarProgramacionSemanal = (semana, anio) => {
    const query = `
        SELECT
        id_parte,
        SUM(cantidad) AS requerimiento
        FROM reqbody
        WHERE semana = ? AND anio = ?
        GROUP BY id_parte
    `;

    db.query(query, [semana, anio], (err, rows) => {
        rows.forEach(row => {
            const insert = `
                INSERT INTO programacion
                (id_parte, fecha, requerimiento, cantidad_programada)
                VALUES (?,?,?,?)
            `;

            db.query(insert, [
                row.id_parte,
                new Date(),
                row.requerimiento,
                row.requerimiento
            ]);
        });
    });
};
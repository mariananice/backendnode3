import db from '../config/db.js';

export const obtenerPlaneacion = async (
    fecha,
    linea
) => {
    const query = `
        WITH datos_por_parte AS (
            SELECT
                id_parte,
                MAX(sph_obj) AS sph_obj,
                MAX(capacidad_racks) AS cap_racks,
                MAX(desocupabilidad_piezas_hr)
                    AS desocupabilidad
            FROM datos
            GROUP BY id_parte
        ),

        programacion_por_parte AS (
            SELECT
                id_parte,
                fecha,
                SUM(cambios) AS cambios,
                SUM(requerimiento) AS requerimiento
            FROM programacion
            GROUP BY id_parte, fecha
        ),

        base AS (
            SELECT
                pl.id_planeacion,
                pl.id_parte,
                pl.linea,
                TIME_FORMAT(pl.hora, '%H:%i:%s') AS hora,
                pl.cantidad_planeada AS cantidad,

                p.numero_parte AS part,
                p.nombre_parte AS descripcion,
                p.strokes,

                COALESCE(
                    c_id.nombre_cspc,
                    c_num.nombre_cspc
                ) AS cspc,

                d.capacidad_total AS doh6am,

                COALESCE(
                    c_id.sph_cspc,
                    c_num.sph_cspc,
                    dp.sph_obj
                ) AS velocidad,

                COALESCE(
                    sp.duracion_min,
                    CASE
                        WHEN COALESCE(
                            c_id.sph_cspc,
                            c_num.sph_cspc,
                            dp.sph_obj
                        ) > 0
                        THEN
                            pl.cantidad_planeada /
                            COALESCE(
                                c_id.sph_cspc,
                                c_num.sph_cspc,
                                dp.sph_obj
                            ) * 60
                        ELSE NULL
                    END
                ) AS tiempoProd,

                obj.hrs_disponibles_dia
                    AS horasTurno,

                pl.cantidad_planeada
                    AS piezasConsideradas,

                pl.cantidad_planeada
                    AS partes,

                dp.cap_racks AS capRacks,
                dp.desocupabilidad,
                pg.cambios,
                pg.requerimiento,

                sp.duracion_min

            FROM planeacion pl

            INNER JOIN parte p
                ON p.id_parte = pl.id_parte

            LEFT JOIN cspc c_id
                ON c_id.id_cspc = p.id_cspc

            LEFT JOIN cspc c_num
                ON c_id.id_cspc IS NULL
               AND TRIM(c_num.numero_parte)
                    = TRIM(p.numero_parte)
               AND c_num.linea = pl.linea

            LEFT JOIN doh d
                ON d.id_cspc = COALESCE(
                    c_id.id_cspc,
                    c_num.id_cspc
                )
               AND d.linea = pl.linea

            LEFT JOIN datos_por_parte dp
                ON dp.id_parte = p.id_parte

            LEFT JOIN datos_obj obj
                ON obj.fecha_dia = pl.fecha

            LEFT JOIN programacion_por_parte pg
                ON pg.id_parte = pl.id_parte
               AND pg.fecha = pl.fecha

            LEFT JOIN secuencia_plan sp
                ON sp.id_parte = pl.id_parte
               AND sp.fecha = pl.fecha

            WHERE pl.fecha = ?
              AND pl.linea = ?
        )

        SELECT
            id_planeacion,
            id_parte,
            linea,
            hora,
            tiempoProd,
            cambios,

            CASE
                WHEN horasTurno > 0
                THEN ROUND(
                    tiempoProd /
                    (horasTurno * 60) * 100,
                    2
                )
                ELSE NULL
            END AS utilizacion,

            part,
            cspc,
            doh6am,

            ROUND(tiempoProd / 60, 2)
                AS conteoHoras,

            horasTurno,
            piezasConsideradas,

            NULL AS dohSecuencia,

            descripcion,
            cantidad,
            strokes,
            partes,
            capRacks,

            CASE
                WHEN requerimiento IS NOT NULL
                THEN cantidad - requerimiento
                ELSE NULL
            END AS dif,

            velocidad,

            CASE
                WHEN desocupabilidad > 0
                THEN ROUND(
                    cantidad / desocupabilidad,
                    2
                )
                ELSE NULL
            END AS hrsRecuperar,

            NULL AS cobertura

        FROM base
        ORDER BY hora ASC
    `;

    const [rows] =
        await db.query(
            query,
            [fecha, linea]
        );

    console.log(
        `Planeación ${fecha} ${linea}:`,
        rows.length,
        'registros'
    );

    return rows;
};

export const crearPlaneacion = async ({
    id_parte,
    linea,
    hora,
    cantidad_planeada,
    fecha
}) => {
    const [parte] =
        await db.query(
            `
            SELECT id_parte
            FROM parte
            WHERE id_parte = ?
            LIMIT 1
            `,
            [id_parte]
        );

    if (parte.length === 0) {
        const error = new Error(
            'El id_parte no existe en la tabla parte'
        );

        error.statusCode = 404;
        throw error;
    }

    /*
     * No se permite más de una planeación
     * para la misma fecha, hora y línea,
     * aunque tenga diferente parte.
     */
    const [duplicado] =
        await db.query(
            `
            SELECT id_planeacion
            FROM planeacion
            WHERE linea = ?
              AND hora = ?
              AND fecha = ?
            LIMIT 1
            `,
            [
                linea,
                hora,
                fecha
            ]
        );

    if (duplicado.length > 0) {
        const error = new Error(
            'Ya existe una planeación para esa fecha, hora y línea'
        );

        error.statusCode = 409;
        throw error;
    }

    const [resultado] =
        await db.query(
            `
            INSERT INTO planeacion (
                id_parte,
                linea,
                hora,
                cantidad_planeada,
                fecha
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                id_parte,
                linea,
                hora,
                cantidad_planeada,
                fecha
            ]
        );

    return {
        id_planeacion: resultado.insertId,
        id_parte,
        linea,
        hora,
        cantidad_planeada,
        fecha
    };
};

export const obtenerPartes = async () => {
    const query = `
        SELECT
            p.id_parte,
            p.numero_parte,
            p.nombre_parte,
            p.id_cspc,
            c.nombre_cspc
        FROM parte p
        LEFT JOIN cspc c
            ON c.id_cspc = p.id_cspc
        ORDER BY p.numero_parte ASC
    `;

    const [rows] =
        await db.query(query);

    return rows;
};

export const eliminarPlaneacion = async (
    id_planeacion
) => {
    const [resultado] = await db.query(
        `
        DELETE FROM planeacion
        WHERE id_planeacion = ?
        `,
        [id_planeacion]
    );

    if (resultado.affectedRows === 0) {
        const error = new Error(
            'La planeación no existe o ya fue eliminada'
        );

        error.statusCode = 404;
        throw error;
    }

    return {
        id_planeacion
    };
};
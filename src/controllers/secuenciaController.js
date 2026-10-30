import db from '../config/db.js';

export async function getSecuenciaPorFecha(req, res) {
    try {
        const fecha = String(
            req.query.fecha || ''
        ).trim();

        const linea = String(
            req.query.linea || ''
        ).trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({
                ok: false,
                message: 'La fecha debe tener formato YYYY-MM-DD.'
            });
        }

        const condiciones = ['r.fecha = ?'];
        const parametros = [fecha];

        if (linea) {
            condiciones.push('p.linea = ?');
            parametros.push(linea);
        }

        const [rows] = await db.query(
            `
            SELECT
                r.fecha,
                p.numero_parte AS numero,
                c.nombre_cspc AS cspc,
                p.linea,
                COALESCE(c.sph_cspc, 0) AS sph,

                SUM(COALESCE(r.cantidad, 0))
                    AS cantidad,

                s.duracion_sec,
                s.banco_sec,

                CASE
                    WHEN p.linea = 'XL1'
                        THEN s.secuencia_xl1
                    WHEN p.linea = 'XL2'
                        THEN s.secuencia_xl2
                    ELSE NULL
                END AS secuencia,

                CASE
                    WHEN p.linea = 'XL1'
                        THEN s.cambios_xl1
                    WHEN p.linea = 'XL2'
                        THEN s.cambios_xl2
                    ELSE NULL
                END AS cambios

            FROM reqbody r

            INNER JOIN parte p
                ON p.id_parte = r.id_parte

            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc

            LEFT JOIN secuencia s
                ON s.fecha = r.fecha

            WHERE ${condiciones.join(' AND ')}

            GROUP BY
                r.fecha,
                p.numero_parte,
                c.nombre_cspc,
                p.linea,
                c.sph_cspc,
                s.duracion_sec,
                s.banco_sec,
                s.secuencia_xl1,
                s.cambios_xl1,
                s.secuencia_xl2,
                s.cambios_xl2

            ORDER BY
                p.linea,
                secuencia,
                p.numero_parte
            `,
            parametros
        );

        return res.json({
            ok: true,
            fecha,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error(
            'Error consultando secuencia:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message: 'Error al consultar la secuencia.'
        });
    }
}

function sumarDias(fecha, dias) {
    const date = new Date(`${fecha}T00:00:00Z`);

    date.setUTCDate(
        date.getUTCDate() + dias
    );

    return date.toISOString().slice(0, 10);
}

function obtenerMiercoles(fechaTexto) {
    const fecha = new Date(
        `${fechaTexto}T00:00:00Z`
    );

    if (Number.isNaN(fecha.getTime())) {
        return null;
    }

    const dia = fecha.getUTCDay();
    const diferencia = (dia + 4) % 7;

    fecha.setUTCDate(
        fecha.getUTCDate() - diferencia
    );

    return fecha.toISOString().slice(0, 10);
}

function numero(valor) {
    const resultado = Number(valor);

    return Number.isFinite(resultado)
        ? resultado
        : 0;
}

export async function getSecuenciaSemana(req, res) {
    try {
        const fechaParametro = String(
            req.query.fecha || ''
        ).trim();

        const linea = String(
            req.query.linea || ''
        ).trim();

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
                fechaParametro
            )
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'La fecha debe tener formato YYYY-MM-DD.'
            });
        }

        const fechaInicio =
            obtenerMiercoles(fechaParametro);

        if (!fechaInicio) {
            return res.status(400).json({
                ok: false,
                message: 'La fecha no es válida.'
            });
        }

        const fechaFin = sumarDias(
            fechaInicio,
            6
        );

        const condiciones = [];
        const parametros = [
            fechaInicio,
            fechaFin,
            fechaInicio,
            fechaFin,
            fechaInicio,
            fechaFin
        ];

        if (linea) {
            condiciones.push('p.linea = ?');
            parametros.push(linea);
        }

        const whereLinea = condiciones.length
            ? `AND ${condiciones.join(' AND ')}`
            : '';

        const [rows] = await db.query(
            `
            SELECT
                DATE_FORMAT(
                    claves.fecha,
                    '%Y-%m-%d'
                ) AS fecha,

                p.id_parte,
                p.numero_parte AS numero,
                c.nombre_cspc AS cspc,
                p.linea,

                COALESCE(
                    datos.sph_obj,
                    0
                ) AS sph,

                COALESCE(
                    req.cantidad_requerida,
                    0
                ) AS cantidad_requerida,

                plan.cantidad_planeada,
                plan.duracion_min,
                plan.banco,
                plan.orden_planeado

            FROM (
                SELECT DISTINCT
                    fecha,
                    id_parte
                FROM reqbody
                WHERE fecha BETWEEN ? AND ?

                UNION

                SELECT DISTINCT
                    fecha,
                    id_parte
                FROM secuencia_plan
                WHERE fecha BETWEEN ? AND ?
            ) claves

            INNER JOIN parte p
                ON p.id_parte = claves.id_parte

            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc

            LEFT JOIN (
                SELECT
                    id_parte,
                    fecha,
                    SUM(cantidad)
                        AS cantidad_requerida
                FROM reqbody
                WHERE fecha BETWEEN ? AND ?
                GROUP BY
                    id_parte,
                    fecha
            ) req
                ON req.id_parte = claves.id_parte
               AND req.fecha = claves.fecha

            LEFT JOIN (
                SELECT d1.*
                FROM datos d1
                INNER JOIN (
                    SELECT
                        id_parte,
                        MIN(id_datos) AS id_datos
                    FROM datos
                    GROUP BY id_parte
                ) d2
                    ON d2.id_datos = d1.id_datos
            ) datos
                ON datos.id_parte = p.id_parte

            LEFT JOIN secuencia_plan plan
                ON plan.id_parte = claves.id_parte
               AND plan.fecha = claves.fecha

            WHERE 1 = 1
            ${whereLinea}

            ORDER BY
                p.linea,
                plan.orden_planeado IS NULL,
                plan.orden_planeado,
                p.numero_parte,
                claves.fecha
            `,
            parametros
        );

        const fechas = Array.from(
            { length: 7 },
            (_, index) =>
                sumarDias(
                    fechaInicio,
                    index
                )
        );

        const mapa = new Map();

        rows.forEach(row => {
            const key = String(row.id_parte);

            if (!mapa.has(key)) {
                mapa.set(key, {
                    id_parte: row.id_parte,
                    numero: row.numero,
                    cspc: row.cspc || 'SIN CSPC',
                    linea: row.linea || 'SIN LÍNEA',
                    sph: numero(row.sph),
                    dias: {},
                    total_requerido: 0,
                    total_planeado: 0
                });
            }

            const item = mapa.get(key);

            const requerida =
                numero(row.cantidad_requerida);

            const planeada =
                row.cantidad_planeada === null ||
                row.cantidad_planeada === undefined
                    ? null
                    : numero(row.cantidad_planeada);

            const duracion =
                row.duracion_min !== null &&
                row.duracion_min !== undefined
                    ? numero(row.duracion_min)
                    : (
                        planeada !== null &&
                        item.sph > 0
                    )
                        ? (
                            planeada /
                            item.sph *
                            60
                        )
                        : null;

            const estado =
                planeada !== null
                    ? 'PLANEADA'
                    : requerida > 0
                        ? 'SIN SECUENCIA'
                        : 'SIN DEMANDA';

            item.dias[row.fecha] = {
                fecha: row.fecha,
                cantidad_requerida: requerida,
                cantidad_planeada: planeada,
                duracion_min: duracion,
                banco: row.banco,
                orden_planeado:
                    row.orden_planeado,
                cambios: 'N/D',
                estado
            };

            item.total_requerido += requerida;

            if (planeada !== null) {
                item.total_planeado += planeada;
            }
        });

        mapa.forEach(item => {
            fechas.forEach(fecha => {
                if (!item.dias[fecha]) {
                    item.dias[fecha] = {
                        fecha,
                        cantidad_requerida: 0,
                        cantidad_planeada: null,
                        duracion_min: null,
                        banco: null,
                        orden_planeado: null,
                        cambios: 'N/D',
                        estado: 'SIN DEMANDA'
                    };
                }
            });
        });

        const data = [...mapa.values()];

        return res.json({
            ok: true,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            fechas,
            data
        });
    } catch (error) {
        console.error(
            'Error consultando secuencia semanal:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message:
                'Error al consultar la secuencia semanal.'
        });
    }
}
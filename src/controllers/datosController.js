import db from '../config/db.js'

export async function getDatos(req, res) {
    try {
        const busqueda = String(
            req.query.q || ''
        ).trim();

        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                Number(req.query.limit) || 100,
                1
            ),
            500
        );

        const offset = (page - 1) * limit;

        const condiciones = [];
        const parametros = [];

        if (busqueda) {
            condiciones.push(`
                (
                    p.nombre_parte LIKE ?
                    OR p.numero_parte LIKE ?
                    OR c.nombre_cspc LIKE ?
                    OR p.modelo LIKE ?
                    OR p.linea LIKE ?
                    OR d.rack_mac LIKE ?
                )
            `);

            const filtro = `%${busqueda}%`;

            parametros.push(
                filtro,
                filtro,
                filtro,
                filtro,
                filtro,
                filtro
            );
        }

        const whereSql = condiciones.length
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

        const joins = `
            FROM parte p

            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc

            LEFT JOIN (
                SELECT d1.*
                FROM datos d1
                INNER JOIN (
                    SELECT
                        id_parte,
                        MIN(id_datos) AS id_datos
                    FROM datos
                    GROUP BY id_parte
                ) primero
                    ON primero.id_datos = d1.id_datos
            ) d
                ON d.id_parte = p.id_parte

            LEFT JOIN (
                SELECT
                    id_cspc,
                    linea,
                    MAX(capacidad_total)
                        AS capacidad_total
                FROM doh
                GROUP BY id_cspc, linea
            ) dh
                ON dh.id_cspc = p.id_cspc
               AND dh.linea = p.linea
        `;

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            ${joins}
            ${whereSql}
            `,
            parametros
        );

        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages = Math.max(
            Math.ceil(total / limit),
            1
        );

        const [rows] = await db.query(
            `
            SELECT
                d.id_datos,

                p.nombre_parte AS part,
                p.numero_parte AS numero,

                COALESCE(
                    c.nombre_cspc,
                    'SIN CSPC'
                ) AS cspc,

                COALESCE(
                    d.modelo,
                    p.modelo,
                    ''
                ) AS modelo,

                COALESCE(
                    d.rack_mac,
                    ''
                ) AS rack,

                COALESCE(
                    p.linea,
                    '0'
                ) AS linea,

                COALESCE(
                    d.lh_rh_golpe,
                    ''
                ) AS lhRhGolpe,

                COALESCE(
                    d.parte_golpe,
                    p.strokes,
                    ''
                ) AS golpe,

                d.sph_mes_anterior AS sphAnt,
                d.sph_obj AS sphObj,
                d.std_pallet AS stdPallet,
                d.std_rack AS stdRack,
                d.racks_prog AS racksPrograma,
                d.loop_racks AS loopRacks,

                COALESCE(
                    d.capacidad_racks,
                    dh.capacidad_total
                ) AS capTotal,

                d.racks_danados AS danados,
                d.racks_inv_danados_diario AS invDiario,

                COALESCE(
                    d.capacidad_racks,
                    dh.capacidad_total
                ) AS cap,

                d.requerimiento_racks AS req,
                d.mezcla_racks AS mezcla,
                d.desocupabilidad_piezas_hr AS desocup

            ${joins}
            ${whereSql}

            ORDER BY
                c.nombre_cspc,
                p.linea,
                p.numero_parte

            LIMIT ${limit}
            OFFSET ${offset}
            `,
            parametros
        );

        /*const [rows] = await db.query(
            `
            SELECT
                p.nombre_parte AS part,
                p.numero_parte AS numero,

                COALESCE(
                    c.nombre_cspc,
                    'SIN CSPC'
                ) AS cspc,

                COALESCE(
                    d.modelo,
                    p.modelo,
                    ''
                ) AS modelo,

                COALESCE(
                    d.rack_mac,
                    ''
                ) AS rack,

                COALESCE(
                    p.linea,
                    '0'
                ) AS linea,

                CAST(
                    p.strokes AS UNSIGNED
                ) AS golpe,

                COALESCE(
                    d.sph_mes_anterior,
                    0
                ) AS sphAnt,

                COALESCE(
                    d.sph_obj,
                    0
                ) AS sphObj,

                COALESCE(
                    d.std_pallet,
                    0
                ) AS stdPallet,

                COALESCE(
                    d.std_rack,
                    0
                ) AS stdRack,

                COALESCE(
                    d.racks_prog,
                    0
                ) AS racksPrograma,

                COALESCE(
                    d.loop_racks,
                    0
                ) AS loopRacks,

                COALESCE(
                    d.capacidad_racks,
                    dh.capacidad_total,
                    0
                ) AS capTotal,

                COALESCE(
                    d.racks_danados,
                    0
                ) AS danados,

                COALESCE(
                    d.racks_inv_danados_diario,
                    0
                ) AS invDiario,

                COALESCE(
                    d.capacidad_racks,
                    dh.capacidad_total,
                    0
                ) AS cap,

                COALESCE(
                    d.requerimiento_racks,
                    0
                ) AS req,

                COALESCE(
                    d.mezcla_racks,
                    0
                ) AS mezcla,

                COALESCE(
                    d.desocupabilidad_piezas_hr,
                    0
                ) AS desocup

            ${joins}
            ${whereSql}

            ORDER BY
                c.nombre_cspc,
                p.linea,
                p.numero_parte

            LIMIT ${limit}
            OFFSET ${offset}
            `,
            parametros
        );*/

        const [objetivoRows] = await db.query(
            `
            SELECT
                lt_externo AS ltExterno,
                sph_objetivo AS sphObjetivo,
                jph,
                hrs_disponibles_dia AS hrsDisponibles,
                jpd,
                fecha_dia AS fechaMiercoles
            FROM datos_obj
            ORDER BY
                fecha_dia DESC,
                id_datos_obj DESC
            LIMIT 1
            `
        );

        /*const [objetivoRows] = await db.query(
            `
            SELECT
                d.id_datos,
                d.lh_rh_golpe,
                d.parte_golpe,
                lt_externo AS ltExterno,
                sph_objetivo AS sphObjetivo,
                jph,
                hrs_disponibles_dia AS hrsDisponibles,
                jpd,
                fecha_dia AS fechaMiercoles
            FROM datos_obj
            ORDER BY fecha_dia DESC, id_datos_obj DESC
            LIMIT 1
            `
        );*/

        return res.json({
            ok: true,
            data: rows,
            summary: objetivoRows[0] || null,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error(
            'Error consultando Datos:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message: 'Error al consultar los datos.'
        });
    }
}

const CAMPOS_EDITABLES = new Set([
    'lh_rh_golpe',
    'modelo',
    'rack_mac',
    'parte_golpe',
    'sph_mes_anterior',
    'sph_obj',
    'std_pallet',
    'std_rack',
    'racks_prog',
    'loop_racks',
    'cantidad_total',
    'racks_danados',
    'racks_inv_danados_diario'
]);

const CAMPOS_ENTEROS = new Set([
    'sph_mes_anterior',
    'sph_obj',
    'std_pallet',
    'std_rack',
    'racks_prog',
    'loop_racks',
    'cantidad_total',
    'racks_danados',
    'racks_inv_danados_diario'
]);

const CAMPOS_ENUM = new Set([
    'lh_rh_golpe',
    'parte_golpe'
]);

const LONGITUDES_TEXTO = {
    modelo: 20,
    rack_mac: 10
};

function normalizarValorCampo(campo, valor) {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ''
    ) {
        return null;
    }

    if (CAMPOS_ENUM.has(campo)) {
        const texto = String(valor).trim();

        if (!['1', '2'].includes(texto)) {
            throw new Error(
                `${campo} solo puede ser 1 o 2.`
            );
        }

        return texto;
    }

    if (CAMPOS_ENTEROS.has(campo)) {
        const numero = Number(valor);

        if (
            !Number.isInteger(numero) ||
            numero < 0
        ) {
            throw new Error(
                `${campo} debe ser un entero mayor o igual a 0.`
            );
        }

        return numero;
    }

    if (Object.prototype.hasOwnProperty.call(
        LONGITUDES_TEXTO,
        campo
    )) {
        const texto = String(valor).trim();
        const maximo = LONGITUDES_TEXTO[campo];

        if (texto.length > maximo) {
            throw new Error(
                `${campo} no puede superar ${maximo} caracteres.`
            );
        }

        return texto || null;
    }

    return valor;
}

export async function actualizarDato(req, res) {
    try {
        const idDatos = Number(
            req.params.id_datos
        );

        if (!Number.isInteger(idDatos) || idDatos <= 0) {
            return res.status(400).json({
                ok: false,
                message: 'id_datos no válido.'
            });
        }

        const body = req.body || {};
        const camposRecibidos = Object.keys(body);

        const camposNoPermitidos =
            camposRecibidos.filter(
                campo => !CAMPOS_EDITABLES.has(campo)
            );

        if (camposNoPermitidos.length) {
            return res.status(400).json({
                ok: false,
                message:
                    'Campos no permitidos: ' +
                    camposNoPermitidos.join(', ')
            });
        }

        if (!camposRecibidos.length) {
            return res.status(400).json({
                ok: false,
                message:
                    'No se recibieron campos para actualizar.'
            });
        }

        const asignaciones = [];
        const valores = [];

        for (const campo of camposRecibidos) {
            asignaciones.push(`${campo} = ?`);

            valores.push(
                normalizarValorCampo(
                    campo,
                    body[campo]
                )
            );
        }

        valores.push(idDatos);

        const [resultado] = await db.query(
            `
            UPDATE datos
            SET ${asignaciones.join(', ')}
            WHERE id_datos = ?
            `,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                message:
                    'No existe el registro de datos.'
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                d.*,
                p.numero_parte,
                p.nombre_parte,
                p.linea AS linea_parte,
                c.nombre_cspc AS cspc
            FROM datos d
            LEFT JOIN parte p
                ON p.id_parte = d.id_parte
            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc
            WHERE d.id_datos = ?
            `,
            [idDatos]
        );

        return res.json({
            ok: true,
            message: 'Dato actualizado correctamente.',
            data: rows[0] || null
        });
    } catch (error) {
        console.error(
            'Error actualizando datos:',
            error
        );

        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

export async function checkDatos(req, res) {
    try {
        const [totales] = await db.query(`
            SELECT
                COUNT(*) AS total_datos,
                SUM(id_parte IS NULL) AS datos_sin_parte,
                SUM(sph_obj IS NULL) AS sin_sph_obj,
                SUM(std_rack IS NULL) AS sin_std_rack,
                SUM(racks_prog IS NULL) AS sin_racks_prog,
                SUM(loop_racks IS NULL) AS sin_loop_racks,
                SUM(requerimiento_racks IS NULL)
                    AS sin_requerimiento,
                SUM(desocupabilidad_piezas_hr IS NULL)
                    AS sin_desocupabilidad
            FROM datos
        `);

        const [partesSinDatos] = await db.query(`
            SELECT
                p.id_parte,
                p.numero_parte,
                p.nombre_parte
            FROM parte p
            LEFT JOIN datos d
                ON d.id_parte = p.id_parte
            WHERE d.id_datos IS NULL
            ORDER BY p.numero_parte
        `);

        const [sinCspc] = await db.query(`
            SELECT
                d.id_datos,
                p.numero_parte,
                p.id_cspc
            FROM datos d
            LEFT JOIN parte p
                ON p.id_parte = d.id_parte
            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc
            WHERE p.id_parte IS NULL
               OR p.id_cspc IS NULL
               OR c.id_cspc IS NULL
        `);

        const [duplicados] = await db.query(`
            SELECT
                id_parte,
                COUNT(*) AS repeticiones
            FROM datos
            WHERE id_parte IS NOT NULL
            GROUP BY id_parte
            HAVING COUNT(*) > 1
        `);

        const [camposIncompletos] = await db.query(`
            SELECT
                d.id_datos,
                p.numero_parte,
                c.nombre_cspc AS cspc,
                d.sph_obj,
                d.std_rack,
                d.racks_prog,
                d.loop_racks,
                d.requerimiento_racks,
                d.desocupabilidad_piezas_hr
            FROM datos d
            LEFT JOIN parte p
                ON p.id_parte = d.id_parte
            LEFT JOIN cspc c
                ON c.id_cspc = p.id_cspc
            WHERE d.sph_obj IS NULL
               OR d.std_rack IS NULL
               OR d.racks_prog IS NULL
               OR d.loop_racks IS NULL
               OR d.requerimiento_racks IS NULL
               OR d.desocupabilidad_piezas_hr IS NULL
            ORDER BY p.numero_parte
            LIMIT 200
        `);

        const [objetivos] = await db.query(`
            SELECT
                id_datos_obj,
                lt_externo,
                sph_objetivo,
                jph,
                hrs_disponibles_dia,
                jpd,
                fecha_dia
            FROM datos_obj
            ORDER BY fecha_dia DESC, id_datos_obj DESC
            LIMIT 1
        `);

        const objetivo = objetivos[0] || null;
        const camposObjetivoFaltantes = [];

        if (!objetivo) {
            camposObjetivoFaltantes.push(
                'No existe registro en datos_obj'
            );
        } else {
            [
                'lt_externo',
                'sph_objetivo',
                'jph',
                'hrs_disponibles_dia',
                'jpd',
                'fecha_dia'
            ].forEach(campo => {
                if (
                    objetivo[campo] === null ||
                    objetivo[campo] === undefined
                ) {
                    camposObjetivoFaltantes.push(campo);
                }
            });
        }

        const problemas = [];

        if (Number(totales[0].datos_sin_parte) > 0) {
            problemas.push('Hay datos sin parte relacionada.');
        }

        if (partesSinDatos.length > 0) {
            problemas.push(
                'Hay partes sin registro en datos.'
            );
        }

        if (sinCspc.length > 0) {
            problemas.push(
                'Hay registros sin CSPC relacionado.'
            );
        }

        if (duplicados.length > 0) {
            problemas.push(
                'Hay partes duplicadas en datos.'
            );
        }

        if (camposIncompletos.length > 0) {
            problemas.push(
                'Hay campos operativos pendientes.'
            );
        }

        if (camposObjetivoFaltantes.length > 0) {
            problemas.push(
                'Faltan objetivos generales.'
            );
        }

        return res.json({
            ok: true,
            estado: problemas.length
                ? 'ADVERTENCIAS'
                : 'OK',

            problemas,

            resumen: {
                totalDatos: Number(
                    totales[0].total_datos || 0
                ),
                datosSinParte: Number(
                    totales[0].datos_sin_parte || 0
                ),
                partesSinDatos:
                    partesSinDatos.length,
                registrosSinCspc:
                    sinCspc.length,
                duplicados:
                    duplicados.length,
                camposIncompletos:
                    camposIncompletos.length,
                camposObjetivoFaltantes:
                    camposObjetivoFaltantes.length
            },

            detalles: {
                partesSinDatos,
                sinCspc,
                duplicados,
                camposIncompletos,
                objetivo,
                camposObjetivoFaltantes
            }
        });
    } catch (error) {
        console.error(
            'Error ejecutando Check de Datos:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message: 'Error ejecutando la validación.'
        });
    }
}
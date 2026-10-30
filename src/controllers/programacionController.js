import db from '../config/db.js'

// PROGRAMACIÓN BASE
export const getProgramacionBase = async (req, res) => {
    try {
        const cspc = String(
            req.query.cspc || ''
        ).trim();

        const linea = String(
            req.query.linea || ''
        ).trim();

        const where = ['1 = 1'];
        const params = [];

        if (cspc) {
            where.push(`
                (
                    c.nombre_cspc LIKE ?
                    OR c.numero_parte LIKE ?
                )
            `);

            params.push(
                `%${cspc}%`,
                `%${cspc}%`
            );
        }

        if (linea) {
            where.push('d.linea = ?');
            params.push(linea);
        }

        const [rows] = await db.query(
            `
            SELECT
                d.id_doh,
                c.id_cspc,
                c.nombre_cspc AS cspc,
                d.linea,
                d.capacidad_total
            FROM doh d
            INNER JOIN cspc c
                ON c.id_cspc = d.id_cspc
            WHERE ${where.join(' AND ')}
            ORDER BY
                c.nombre_cspc,
                d.linea
            `,
            params
        );

        return res.json(rows);
    } catch (error) {
        console.error(
            'Error en getProgramacionBase:',
            error.message
        );

        return res.status(500).json({
            ok: false,
            message:
                'Error al cargar datos de programación.'
        });
    }
};

// FUNCIONES AUXILIARES
function obtenerLunesSemana(anio, semana) {
    const fecha = new Date(
        Date.UTC(anio, 0, 4)
    );

    const dia = fecha.getUTCDay() || 7;

    fecha.setUTCDate(
        fecha.getUTCDate() - dia + 1
    );

    fecha.setUTCDate(
        fecha.getUTCDate() + ((semana - 1) * 7)
    );

    return fecha.toISOString().slice(0, 10);
}

function sumarDias(fechaString, dias) {
    const fecha = new Date(
        `${fechaString}T00:00:00Z`
    );

    fecha.setUTCDate(
        fecha.getUTCDate() + dias
    );

    return fecha.toISOString().slice(0, 10);
}

function numeroSeguro(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function convertirFecha(valor) {
    if (!valor) return null;

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    return String(valor).slice(0, 10);
}

//   PROGRAMACIÓN ANUAL
export async function getProgramacionAnual(req, res) {
    try {
        const semana = Number(
            req.query.semana
        );

        const anio = Number(
            req.query.anio
        );

        console.log('[PROGRAMACION] Solicitud recibida:', {
            semana,
            anio,
            url: req.originalUrl
        });

        const paginaSolicitada = Number(
            req.query.page || 1
        );

        const tamanioSolicitado = Number(
            req.query.pageSize || 50
        );

        const page = Number.isInteger(
            paginaSolicitada
        ) && paginaSolicitada > 0
            ? paginaSolicitada
            : 1;

        const pageSize = Number.isInteger(
            tamanioSolicitado
        )
            ? Math.min(
                Math.max(tamanioSolicitado, 1),
                100
            )
            : 50;

        const filtroCspc = String(
            req.query.cspc || ''
        ).trim();

        const filtroLinea = String(
            req.query.linea || ''
        ).trim();

        if (
            !Number.isInteger(semana) ||
            semana < 1 ||
            semana > 53
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'La semana debe estar entre 1 y 53.'
            });
        }

        if (
            !Number.isInteger(anio) ||
            anio < 2000 ||
            anio > 2100
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'El año no es válido.'
            });
        }

        const [cargaRows] = await db.query(`
            SELECT
                id_carga,
                fecha_inicio_programa
            FROM cargas_excel
            WHERE estado = 'ACTIVA'
            ORDER BY activated_at DESC, id_carga DESC
            LIMIT 1
        `);

        const idCargaActiva = cargaRows[0].id_carga;

        const fechaBase =
            convertirFecha(
                cargaRows[0].fecha_inicio_programa
            ) || `${anio}-01-05`;

        const fechaInicio =
            obtenerInicioSemanaOperativa(
                fechaBase,
                semana
            );

        const fechaFin =
            sumarDias(fechaInicio, 6);

        console.log('[PROGRAMACION] Rango:', {
            semana,
            anio,
            fechaInicio,
            fechaFin
        });

        /*const [cargaRows] = await db.query(
            `
            SELECT
                id_carga,
                fecha_inicio_programa
            FROM cargas_excel
            
            WHERE estado = 'ACTIVA'
            ORDER BY
                activated_at DESC,
                id_carga DESC
            LIMIT 1
            `
        );*/

        if (!cargaRows.length) {
            return res.json({
                ok: true,
                semana,
                anio,
                data: [],
                pagination: {
                    page: 1,
                    pageSize,
                    total: 0,
                    totalPages: 1
                }
            });
        }

        /*const idCargaActiva =
            cargaRows[0].id_carga;

        const fechaBase =
            convertirFecha(
                cargaRows[0].fecha_inicio_programa
            ) || `${anio}-01-05`;

        console.log('[PROGRAMACION] Carga activa:', {
            idCargaActiva,
            fechaBase
        });*/  

        /*
         * La tabla principal es parte.
         * Así siempre se muestran:
         * CSPC, línea y capacidad total.
         *
         * programa_excel se relaciona por numero_parte
         * únicamente cuando existe coincidencia.
         */
        const joins = `
            FROM parte p

            LEFT JOIN cspc c_id
                ON c_id.id_cspc = p.id_cspc

            LEFT JOIN (
                SELECT
                    TRIM(numero_parte)
                        AS numero_parte_key,
                    MIN(id_cspc)
                        AS id_cspc
                FROM cspc
                WHERE numero_parte IS NOT NULL
                  AND TRIM(numero_parte) <> ''
                GROUP BY TRIM(numero_parte)
            ) c_key
                ON c_key.numero_parte_key =
                   TRIM(p.numero_parte)
               AND c_id.id_cspc IS NULL

            LEFT JOIN cspc c_num
                ON c_num.id_cspc = c_key.id_cspc

            LEFT JOIN (
                SELECT
                    id_cspc,
                    linea,
                    MAX(capacidad_total)
                        AS capacidad_total
                FROM doh
                GROUP BY id_cspc, linea
            ) d
                ON d.id_cspc = COALESCE(
                    c_id.id_cspc,
                    c_num.id_cspc
                )
               AND d.linea = COALESCE(
                    p.linea,
                    c_id.linea,
                    c_num.linea
                )

            LEFT JOIN (
                SELECT
                    id_carga,
                    TRIM(numero_parte)
                        AS numero_parte_key,

                    MIN(id_programa)
                        AS id_programa,

                    MAX(id_parte)
                        AS id_parte,

                    MAX(descripcion)
                        AS descripcion,

                    MAX(proveedor)
                        AS proveedor,

                    MAX(total_disponible)
                        AS total_disponible,

                    MAX(doh_excel)
                        AS doh_excel,

                    MAX(in_transit)
                        AS in_transit,

                    MAX(bbal)
                        AS bbal,

                    MAX(cbal)
                        AS cbal

                FROM programa_excel
                WHERE id_carga = ?
                GROUP BY
                    id_carga,
                    TRIM(numero_parte)
            ) pe
                ON pe.numero_parte_key =
                   TRIM(p.numero_parte)
        `;

        const condiciones = [
            `p.id_parte IS NOT NULL`
        ];

        const parametrosFiltro = [];

        if (filtroCspc) {
            condiciones.push(`
                (
                    COALESCE(
                        c_id.nombre_cspc,
                        c_num.nombre_cspc,
                        ''
                    ) LIKE ?

                    OR COALESCE(
                        c_id.numero_parte,
                        c_num.numero_parte,
                        ''
                    ) LIKE ?

                    OR p.numero_parte LIKE ?
                )
            `);

            const filtro = `%${filtroCspc}%`;

            parametrosFiltro.push(
                filtro,
                filtro,
                filtro
            );
        }

        if (filtroLinea) {
            condiciones.push(`
                COALESCE(
                    p.linea,
                    c_id.linea,
                    c_num.linea,
                    ''
                ) = ?
            `);

            parametrosFiltro.push(
                filtroLinea
            );
        }

        const whereSql = `
            WHERE ${condiciones.join(' AND ')}
        `;

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            ${joins}
            ${whereSql}
            `,
            [
                idCargaActiva,
                ...parametrosFiltro
            ]
        );

        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages = Math.max(
            Math.ceil(total / pageSize),
            1
        );

        const paginaReal = Math.min(
            page,
            totalPages
        );

        const offset =
            (paginaReal - 1) * pageSize;

        const [baseRows] = await db.query(
            `
            SELECT
                p.id_parte,

                COALESCE(
                    c_id.id_cspc,
                    c_num.id_cspc,
                    0
                ) AS id_cspc,

                COALESCE(
                    c_id.nombre_cspc,
                    c_num.nombre_cspc,
                    'SIN CSPC'
                ) AS cspc,

                COALESCE(
                    p.linea,
                    c_id.linea,
                    c_num.linea,
                    'SIN LINEA'
                ) AS linea,

                COALESCE(
                    d.capacidad_total,
                    0
                ) AS capacidad_total,

                p.numero_parte,

                COALESCE(
                    pe.id_programa,
                    NULL
                ) AS id_programa,

                COALESCE(
                    pe.id_carga,
                    ?
                ) AS id_carga,

                COALESCE(
                    pe.descripcion,
                    p.nombre_parte,
                    ''
                ) AS descripcion,

                COALESCE(
                    pe.proveedor,
                    ''
                ) AS proveedor,

                COALESCE(
                    pe.total_disponible,
                    0
                ) AS total_disponible,

                COALESCE(
                    pe.doh_excel,
                    0
                ) AS doh_excel,

                COALESCE(
                    pe.doh_excel,
                    0
                ) AS doh,

                COALESCE(
                    pe.in_transit,
                    0
                ) AS in_transit,

                COALESCE(
                    pe.bbal,
                    0
                ) AS bbal,

                COALESCE(
                    pe.cbal,
                    0
                ) AS cbal

            ${joins}
            ${whereSql}

            ORDER BY
                cspc,
                linea,
                p.numero_parte

            LIMIT ${pageSize}
            OFFSET ${offset}
            `,
            [
                idCargaActiva,
                idCargaActiva,
                ...parametrosFiltro
            ]
        );

        const idsPrograma = baseRows
            .map(row => row.id_programa)
            .filter(Boolean);

        const rowsMap = new Map();

        baseRows.forEach(row => {
            rowsMap.set(
                row.id_parte,
                {
                    ...row,
                    daily: {},
                    weekly: {
                        WREQ: null,
                        SCHDWK: null
                    },
                    periodo: null,
                    semana,
                    anio,
                    fecha_inicio: null,
                    fecha_fin: null,
                    requerimiento: 0,
                    cantidad_programada: 0,
                    diferencia: 0
                }
            );
        });

        if (idsPrograma.length > 0) {
            //const fechaInicio =
                //obtenerLunesSemana(anio, semana);
                //obtenerInicioSemanaOperativa(
                    //fechaBase,
                    //semana
                //);

            //const fechaFin =
                //sumarDias(fechaInicio, 6);

            const placeholders = idsPrograma
                .map(() => '?')
                .join(',');

            const [valueRows] = await db.query(
                `
                SELECT
                    id_programa,
                    tipo_valor,
                    periodo,
                    fecha_inicio,
                    fecha_fin,
                    semana,
                    anio,
                    cantidad
                FROM programa_excel_valores
                WHERE id_programa IN (${placeholders})
                AND (
                        (
                            tipo_valor = 'DREQ'
                            AND fecha_inicio >= '${fechaInicio}'
                            AND fecha_inicio <= '${fechaFin}'
                        )
                        OR
                        (
                            tipo_valor IN ('WREQ', 'SCHDWK')
                            AND semana = ${Number(semana)}
                            AND anio = ${Number(anio)}
                        )
                )
                ORDER BY
                    id_programa,
                    tipo_valor,
                    periodo
                `,
                idsPrograma
            );

            /*const [valueRows] = await db.query(
                `
                SELECT
                    id_programa,
                    tipo_valor,
                    periodo,
                    fecha_inicio,
                    fecha_fin,
                    semana,
                    anio,
                    cantidad
                FROM programa_excel_valores
                WHERE id_programa IN (${placeholders})
                  AND (
                        (
                            tipo_valor = 'DREQ'
                            AND fecha_inicio BETWEEN ?
                            AND ?
                        )
                        OR
                        (
                            tipo_valor IN (
                                'WREQ',
                                'SCHDWK'
                            )
                            AND semana = ?
                            AND anio = ?
                        )
                  )
                ORDER BY
                    id_programa,
                    tipo_valor,
                    periodo
                `,
                [
                    ...idsPrograma,
                    //fechaInicio,
                    //fechaFin,
                    //semana,
                    //anio
                ]
            );*/

            const programaToParte = new Map();

            baseRows.forEach(row => {
                if (row.id_programa) {
                    programaToParte.set(
                        row.id_programa,
                        row.id_parte
                    );
                }
            });

            console.log(
                '[PROGRAMACION] Filas base:',
                baseRows.length,
                baseRows[0] || null
            );

            valueRows.forEach(value => {
                const idParte =
                    programaToParte.get(
                        value.id_programa
                    );

                const row = rowsMap.get(idParte);

                if (!row) return;

                const cantidad =
                    numeroSeguro(value.cantidad);

                const fecha =
                    convertirFecha(value.fecha_inicio);

                if (
                    value.tipo_valor === 'DREQ'
                ) {
                    row.daily[fecha] = {
                        periodo: value.periodo,
                        cantidad
                    };

                    return;
                }

                row.weekly[
                    value.tipo_valor
                ] = {
                    periodo: value.periodo,
                    cantidad,
                    fecha_inicio:
                        convertirFecha(
                            value.fecha_inicio
                        ),
                    fecha_fin:
                        convertirFecha(
                            value.fecha_fin
                        ),
                    semana: value.semana,
                    anio: value.anio
                };
            });

            console.log(
                '[PROGRAMACION] Valores semanales:',
                valueRows.length,
                valueRows[0] || null
            );

            rowsMap.forEach(row => {
                const weeklySchedule =
                    row.weekly.SCHDWK;

                const weeklyRequirement =
                    row.weekly.WREQ;

                row.periodo =
                    weeklySchedule?.periodo || null;

                row.fecha_inicio = fechaInicio;
                
                row.fecha_fin = fechaFin;

                row.requerimiento =
                    numeroSeguro(
                        weeklyRequirement?.cantidad
                    );

                row.cantidad_programada =
                    numeroSeguro(
                        weeklySchedule?.cantidad
                    );

                row.diferencia =
                    row.cantidad_programada -
                    row.requerimiento;
            });
        }

        const dataFinal = [...rowsMap.values()].map(row => {
            const stockInicial = numeroSeguro(row.cbal);
            const stockDisponible = numeroSeguro(row.total_disponible);
            const requerimiento = numeroSeguro(row.requerimiento);
            const cantidadProgramada = numeroSeguro(row.cantidad_programada);

            return {
                ...row,

                stock_inicial: stockInicial,
                stock_disponible: stockDisponible,

                cambios: cantidadProgramada - requerimiento
            };
        });

        console.log(
            '[PROGRAMACION] Resultado final:',
            dataFinal.length,
            dataFinal[0] || null
        );

        return res.json({
            ok: true,
            semana,
            anio,
            data: dataFinal,
            pagination: {
                page: paginaReal,
                pageSize,
                total,
                totalPages
            },

            range: {
                from: fechaInicio,
                to: fechaFin
                /*from: obtenerInicioSemanaOperativa(
                    fechaBase,
                    semana
                ),
                to: sumarDias(
                    obtenerInicioSemanaOperativa(
                        fechaBase,
                        semana
                    ),
                    6
                )*/
            }
        });
    }  catch (error) {
            console.error(
                'ERROR DETALLADO PROGRAMACION:',
                error
            );

            return res.status(500).json({
                ok: false,
                message: error.sqlMessage || error.message,
                code: error.code || null
            });
        }
 
    /*catch (error) {
        console.error(
            'Error en getProgramacionAnual:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message:
                'Error al consultar la programación anual.'
        });
    }*/
};

function obtenerInicioSemanaOperativa(
    fechaBase,
    semana
) {
    return sumarDias(
        fechaBase,
        2 + ((semana - 1) * 7)
    );
}

export async function getProgramacionResumenSemanal(req, res) {
    try {
        const semana = Number(req.query.semana);
        const anio = Number(req.query.anio);

        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const pageSize = Math.min(
            Math.max(
                Number(req.query.pageSize) || 50,
                1
            ),
            100
        );

        const filtroCspc = String(
            req.query.cspc || ''
        ).trim();

        const filtroLinea = String(
            req.query.linea || ''
        ).trim();

        if (
            !Number.isInteger(semana) ||
            semana < 1 ||
            semana > 53
        ) {
            return res.status(400).json({
                ok: false,
                message: 'La semana debe estar entre 1 y 53.'
            });
        }

        if (
            !Number.isInteger(anio) ||
            anio < 2000 ||
            anio > 2100
        ) {
            return res.status(400).json({
                ok: false,
                message: 'El año no es válido.'
            });
        }

        const condiciones = ['1 = 1'];
        const filtros = [];

        if (filtroCspc) {
            condiciones.push(`
                (
                    c.nombre_cspc LIKE ?
                    OR c.numero_parte LIKE ?
                    OR p.numero_parte LIKE ?
                )
            `);

            const valor = `%${filtroCspc}%`;

            filtros.push(
                valor,
                valor,
                valor
            );
        }

        if (filtroLinea) {
            condiciones.push('p.linea = ?');
            filtros.push(filtroLinea);
        }

        const fromSql = `
            FROM parte p

            INNER JOIN cspc c
                ON c.id_cspc = p.id_cspc

            LEFT JOIN doh d
                ON d.id_cspc = p.id_cspc
               AND d.linea = p.linea

            LEFT JOIN (
                SELECT
                    r.id_parte,
                    r.semana,
                    r.anio,
                    SUM(r.cantidad)
                        AS requerimiento_reqbody
                FROM reqbody r
                WHERE r.semana = ?
                  AND r.anio = ?
                GROUP BY
                    r.id_parte,
                    r.semana,
                    r.anio
            ) rb
                ON rb.id_parte = p.id_parte

            LEFT JOIN (
                SELECT
                    pe.id_parte,
                    pev.semana,
                    pev.anio,

                    SUM(
                        CASE
                            WHEN pev.tipo_valor = 'WREQ'
                            THEN pev.cantidad
                            ELSE 0
                        END
                    ) AS requerimiento_semanal,

                    SUM(
                        CASE
                            WHEN pev.tipo_valor = 'SCHDWK'
                            THEN pev.cantidad
                            ELSE 0
                        END
                    ) AS cantidad_programada

                FROM programa_excel pe

                INNER JOIN programa_excel_valores pev
                    ON pev.id_programa = pe.id_programa

                INNER JOIN cargas_excel ce
                    ON ce.id_carga = pe.id_carga

                WHERE ce.id_carga = (
                    SELECT id_carga
                    FROM cargas_excel
                    WHERE estado = 'ACTIVA'
                    ORDER BY
                        activated_at DESC,
                        id_carga DESC
                    LIMIT 1
                )
                  AND pev.semana = ?
                  AND pev.anio = ?
                  AND pev.tipo_valor IN (
                      'WREQ',
                      'SCHDWK'
                  )
                  AND pe.id_parte IS NOT NULL

                GROUP BY
                    pe.id_parte,
                    pev.semana,
                    pev.anio
            ) anual
                ON anual.id_parte = p.id_parte

            WHERE ${condiciones.join(' AND ')}
        `;

        const parametrosBase = [
            semana,
            anio,
            semana,
            anio,
            ...filtros
        ];

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            ${fromSql}
            `,
            parametrosBase
        );

        const total = Number(
            countRows[0]?.total || 0
        );

        const totalPages = Math.max(
            Math.ceil(total / pageSize),
            1
        );

        const paginaReal = Math.min(
            page,
            totalPages
        );

        const offset =
            (paginaReal - 1) * pageSize;

        const [rows] = await db.query(
            `
            SELECT
                p.id_parte,
                p.numero_parte,

                c.id_cspc,
                c.nombre_cspc AS cspc,
                p.linea,

                COALESCE(
                    d.capacidad_total,
                    0
                ) AS capacidad_total,

                COALESCE(
                    rb.requerimiento_reqbody,
                    0
                ) AS requerimiento_reqbody,

                COALESCE(
                    anual.requerimiento_semanal,
                    0
                ) AS requerimiento_semanal,

                COALESCE(
                    anual.cantidad_programada,
                    0
                ) AS cantidad_programada,

                COALESCE(
                    anual.cantidad_programada,
                    0
                ) - COALESCE(
                    rb.requerimiento_reqbody,
                    0
                ) AS diferencia_reqbody,

                COALESCE(
                    anual.cantidad_programada,
                    0
                ) - COALESCE(
                    anual.requerimiento_semanal,
                    0
                ) AS diferencia_semanal

            ${fromSql}

            ORDER BY
                c.nombre_cspc,
                p.linea,
                p.numero_parte

            LIMIT ${pageSize}
            OFFSET ${offset}
            `,
            parametrosBase
        );

        return res.json({
            ok: true,
            semana,
            anio,
            data: rows,
            pagination: {
                page: paginaReal,
                pageSize,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error(
            'Error en getProgramacionResumenSemanal:',
            error.sqlMessage || error.message
        );

        return res.status(500).json({
            ok: false,
            message:
                'Error al consultar el resumen semanal.'
        });
    }
}
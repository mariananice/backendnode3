import db from '../config/db.js'
import * as XLSX from 'xlsx'

const DATOS_FIELDS = [
    'lh_rh_golpe',
    'modelo',
    'rack_mac',
    'linea',
    'parte_golpe',
    'sph_mes_anterior',
    'sph_obj',
    'std_pallet',
    'std_rack',
    'racks_prog',
    'loop_racks',
    'cantidad_total',
    'racks_danados',
    'racks_inv_danados_diario',
    'capacidad_racks',
    'requerimiento_racks',
    'mezcla_racks',
    'desocupabilidad_piezas_hr'
];

const DATOS_OBJ_FIELDS = [
    'lt_externo',
    'sph_objetivo',
    'jph',
    'hrs_disponibles_dia',
    'jpd'
];

function normalizarEncabezado(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function normalizarFila(fila) {
    const resultado = {};

    const alias = {
        racks_inv_danados_diaro:
            'racks_inv_danados_diario',

        req_racks:
            'requerimiento_racks',

        lh_rh_golpe:
            'lh_rh_golpe'
    };

    Object.entries(fila).forEach(([clave, valor]) => {
        const encabezado =
            normalizarEncabezado(clave);

        const nombre =
            alias[encabezado] || encabezado;

        resultado[nombre] = valor;
    });

    return resultado;
}

function obtenerFilas(workbook, nombreHoja) {
    const hojaEncontrada =
        workbook.SheetNames.find(nombre =>
            normalizarEncabezado(nombre) ===
            normalizarEncabezado(nombreHoja)
        );

    if (!hojaEncontrada) {
        throw new Error(
            `No existe la hoja "${nombreHoja}".`
        );
    }

    return XLSX.utils
        .sheet_to_json(
            workbook.Sheets[hojaEncontrada],
            {
                defval: null,
                raw: true
            }
        )
        .map(normalizarFila);
}

function estaVacio(valor) {
    return (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ''
    );
}

function texto(valor) {
    return estaVacio(valor)
        ? null
        : String(valor).trim();
}

function numero(valor) {
    if (estaVacio(valor)) return null;

    if (typeof valor === 'number') {
        return Number.isFinite(valor)
            ? valor
            : null;
    }

    const resultado = Number(
        String(valor)
            .replace(/,/g, '')
            .replace('%', '')
            .trim()
    );

    return Number.isFinite(resultado)
        ? resultado
        : null;
}

function entero(valor) {
    const resultado = numero(valor);

    return resultado === null
        ? null
        : Math.round(resultado);
}

function porcentajeDecimal(valor) {
    if (estaVacio(valor)) return null;

    const textoValor = String(valor).trim();
    const resultado = numero(valor);

    if (resultado === null) return null;

    if (textoValor.includes('%')) {
        return resultado / 100;
    }

    return resultado > 1
        ? resultado / 100
        : resultado;
}

function normalizarLinea(
    valor,
    lineaParte = null
) {
    if (estaVacio(valor)) {
        return lineaParte || null;
    }

    const linea = String(valor)
        .trim()
        .toUpperCase();

    if (linea === '1' || linea === 'XL1') {
        return 'XL1';
    }

    if (linea === '2' || linea === 'XL2') {
        return 'XL2';
    }

    if (linea === '0') {
        return '0';
    }

    return lineaParte || null;
}

function normalizarEnum12(valor) {
    if (estaVacio(valor)) return null;

    const valorTexto = String(valor)
        .trim();

    return ['1', '2'].includes(valorTexto)
        ? valorTexto
        : null;
}

function fechaISO(valor) {
    if (estaVacio(valor)) return null;

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    if (typeof valor === 'number') {
        const fecha = new Date(
            Date.UTC(1899, 11, 30) +
            valor * 86400000
        );

        return fecha.toISOString().slice(0, 10);
    }

    const textoFecha = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(textoFecha)) {
        return textoFecha;
    }

    const partes = textoFecha.split(/[\/.-]/);

    if (partes.length === 3) {
        if (partes[0].length === 4) {
            return [
                partes[0],
                partes[1].padStart(2, '0'),
                partes[2].padStart(2, '0')
            ].join('-');
        }

        return [
            partes[2],
            partes[1].padStart(2, '0'),
            partes[0].padStart(2, '0')
        ].join('-');
    }

    const fecha = new Date(textoFecha);

    return Number.isNaN(fecha.getTime())
        ? null
        : fecha.toISOString().slice(0, 10);
}

function clave(valor) {
    return String(valor ?? '')
        .trim()
        .toUpperCase();
}

function valorConservado(
    valorNuevo,
    valorAnterior
) {
    return estaVacio(valorNuevo)
        ? valorAnterior ?? null
        : valorNuevo;
}

function crearFilasDatos(
    filasExcel,
    mapaPartes
) {
    const errores = [];
    const filas = [];

    filasExcel
        .filter(row => !estaVacio(row.numero_parte))
        .forEach((row, index) => {
            const parte = mapaPartes.get(
                clave(row.numero_parte)
            );

            if (!parte) {
                errores.push(
                    `Hoja datos, fila ${index + 2}: ` +
                    `no existe numero_parte ` +
                    `${row.numero_parte} en parte.`
                );

                return;
            }

            filas.push({
                id_parte: parte.id_parte,

                lh_rh_golpe:
                    normalizarEnum12(
                        row.lh_rh_golpe
                    ),

                modelo: texto(row.modelo),
                rack_mac: texto(row.rack_mac),

                linea: normalizarLinea(
                    row.linea,
                    parte.linea
                ),

                parte_golpe:
                    normalizarEnum12(
                        row.parte_golpe
                    ),

                sph_mes_anterior:
                    entero(row.sph_mes_anterior),

                sph_obj:
                    entero(row.sph_obj),

                std_pallet:
                    entero(row.std_pallet),

                std_rack:
                    entero(row.std_rack),

                racks_prog:
                    entero(row.racks_prog),

                loop_racks:
                    entero(row.loop_racks),

                cantidad_total:
                    entero(row.cantidad_total),

                racks_danados:
                    entero(row.racks_danados),

                racks_inv_danados_diario:
                    entero(
                        row.racks_inv_danados_diario
                    ),

                capacidad_racks:
                    entero(row.capacidad_racks),

                requerimiento_racks:
                    entero(
                        row.requerimiento_racks
                    ),

                mezcla_racks:
                    porcentajeDecimal(
                        row.mezcla_racks
                    ),

                desocupabilidad_piezas_hr:
                    entero(
                        row.desocupabilidad_piezas_hr
                    )
            });
        });

    return {
        filas,
        errores
    };
}

async function guardarDatos(
    connection,
    filasNuevas
) {
    const [existentes] = await connection.query(
        `
        SELECT *
        FROM datos
        WHERE id_parte IS NOT NULL
        `
    );

    const mapa = new Map();

    existentes.forEach(row => {
        mapa.set(
            Number(row.id_parte),
            row
        );
    });

    let actualizados = 0;
    let insertados = 0;

    for (const filaNueva of filasNuevas) {
        const anterior = mapa.get(
            Number(filaNueva.id_parte)
        );

        const valores = DATOS_FIELDS.map(
            campo =>
                valorConservado(
                    filaNueva[campo],
                    anterior?.[campo]
                )
        );

        if (anterior) {
            const asignaciones = DATOS_FIELDS
                .map(campo => `${campo} = ?`)
                .join(', ');

            await connection.query(
                `
                UPDATE datos
                SET ${asignaciones}
                WHERE id_datos = ?
                `,
                [
                    ...valores,
                    anterior.id_datos
                ]
            );

            actualizados++;
        } else {
            const columnas = [
                'id_parte',
                ...DATOS_FIELDS
            ];

            const placeholders = columnas
                .map(() => '?')
                .join(', ');

            await connection.query(
                `
                INSERT INTO datos
                (${columnas.join(', ')})
                VALUES (${placeholders})
                `,
                [
                    filaNueva.id_parte,
                    ...valores
                ]
            );

            insertados++;
        }
    }

    return {
        actualizados,
        insertados
    };
}

async function guardarDatosObjetivo(
    connection,
    filasNuevas
) {
    const [existentes] = await connection.query(
        `
        SELECT *
        FROM datos_obj
        `
    );

    const mapa = new Map();

    existentes.forEach(row => {
        mapa.set(
            fechaISO(row.fecha_dia),
            row
        );
    });

    let actualizados = 0;
    let insertados = 0;

    for (const filaNueva of filasNuevas) {
        const anterior = mapa.get(
            filaNueva.fecha_dia
        );

        const valores = DATOS_OBJ_FIELDS.map(
            campo =>
                valorConservado(
                    filaNueva[campo],
                    anterior?.[campo]
                )
        );

        if (anterior) {
            await connection.query(
                `
                UPDATE datos_obj
                SET
                    lt_externo = ?,
                    sph_objetivo = ?,
                    jph = ?,
                    hrs_disponibles_dia = ?,
                    jpd = ?
                WHERE id_datos_obj = ?
                `,
                [
                    ...valores,
                    anterior.id_datos_obj
                ]
            );

            actualizados++;
        } else {
            await connection.query(
                `
                INSERT INTO datos_obj
                (
                    lt_externo,
                    sph_objetivo,
                    jph,
                    hrs_disponibles_dia,
                    jpd,
                    fecha_dia
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    ...valores,
                    filaNueva.fecha_dia
                ]
            );

            insertados++;
        }
    }

    return {
        actualizados,
        insertados
    };
}

async function guardarDatosProm(
    connection,
    filasExcel,
    mapaCspcs
) {
    let actualizados = 0;
    let insertados = 0;
    let omitidos = 0;

    const [existentes] = await connection.query(
        `
        SELECT *
        FROM datos_prom
        `
    );

    const mapaExistentes = new Map();

    existentes.forEach(row => {
        mapaExistentes.set(
            Number(row.id_cspc),
            row
        );
    });

    for (const [index, row] of filasExcel.entries()) {
        if (estaVacio(row.nombre_cspc)) {
            continue;
        }

        const tieneMetricas = [
            row.cinco_prom,
            row.req_prom,
            row.tres_prom,
            row.racks_prom,
            row.std_racks_prom,
            row.piezas_prom
        ].some(valor => !estaVacio(valor));

        if (!tieneMetricas) {
            omitidos++;
            continue;
        }

        const idCspc = mapaCspcs.get(
            clave(row.nombre_cspc)
        );

        if (!idCspc) {
            throw new Error(
                `Hoja datos_prom, fila ${index + 2}: ` +
                `no existe CSPC ${row.nombre_cspc}.`
            );
        }

        if (
            estaVacio(row.req_prom) ||
            estaVacio(row.std_racks_prom) ||
            estaVacio(row.piezas_prom)
        ) {
            throw new Error(
                `Hoja datos_prom, fila ${index + 2}: ` +
                'faltan campos obligatorios.'
            );
        }

        const filaNueva = {
            id_cspc: idCspc,
            cinco_prom: numero(row.cinco_prom),
            req_prom: entero(row.req_prom),
            tres_prom: numero(row.tres_prom),
            racks_prom: numero(row.racks_prom),
            std_racks_prom:
                entero(row.std_racks_prom),
            piezas_prom:
                entero(row.piezas_prom)
        };

        const anterior = mapaExistentes.get(
            idCspc
        );

        const valores = [
            valorConservado(
                filaNueva.cinco_prom,
                anterior?.cinco_prom
            ),
            valorConservado(
                filaNueva.req_prom,
                anterior?.req_prom
            ),
            valorConservado(
                filaNueva.tres_prom,
                anterior?.tres_prom
            ),
            valorConservado(
                filaNueva.racks_prom,
                anterior?.racks_prom
            ),
            valorConservado(
                filaNueva.std_racks_prom,
                anterior?.std_racks_prom
            ),
            valorConservado(
                filaNueva.piezas_prom,
                anterior?.piezas_prom
            )
        ];

        if (anterior) {
            await connection.query(
                `
                UPDATE datos_prom
                SET
                    cinco_prom = ?,
                    req_prom = ?,
                    tres_prom = ?,
                    racks_prom = ?,
                    std_racks_prom = ?,
                    piezas_prom = ?
                WHERE id_datos_prom = ?
                `,
                [
                    ...valores,
                    anterior.id_datos_prom
                ]
            );

            actualizados++;
        } else {
            await connection.query(
                `
                INSERT INTO datos_prom
                (
                    id_cspc,
                    cinco_prom,
                    req_prom,
                    tres_prom,
                    racks_prom,
                    std_racks_prom,
                    piezas_prom
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    idCspc,
                    ...valores
                ]
            );

            insertados++;
        }
    }

    return {
        actualizados,
        insertados,
        omitidos
    };
}

export async function importarDatos(req, res) {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        if (!req.file) {
            throw new Error(
                'No se recibió el archivo Excel.'
            );
        }

        const extension = req.file.originalname
            .toLowerCase()
            .split('.')
            .pop();

        if (!['xlsx', 'xls'].includes(extension)) {
            throw new Error(
                'El archivo debe ser .xlsx o .xls.'
            );
        }

        const workbook = XLSX.read(
            req.file.buffer,
            {
                type: 'buffer',
                cellDates: true
            }
        );

        const filasDatosExcel = obtenerFilas(
            workbook,
            'datos'
        );

        const filasObjetivoExcel = obtenerFilas(
            workbook,
            'datos_obj'
        );

        const filasPromExcel =
            workbook.SheetNames.some(nombre =>
                normalizarEncabezado(nombre) ===
                'datos_prom'
            )
                ? obtenerFilas(
                    workbook,
                    'datos_prom'
                )
                : [];

        const [partes] = await connection.query(
            `
            SELECT
                id_parte,
                numero_parte,
                linea
            FROM parte
            `
        );

        const mapaPartes = new Map();

        partes.forEach(parte => {
            mapaPartes.set(
                clave(parte.numero_parte),
                parte
            );
        });

        const resultadoFilas =
            crearFilasDatos(
                filasDatosExcel,
                mapaPartes
            );

        if (!resultadoFilas.filas.length) {
            throw new Error(
                'La hoja datos no tiene filas válidas.'
            );
        }

        if (resultadoFilas.errores.length) {
            throw new Error(
                resultadoFilas.errores
                    .slice(0, 20)
                    .join('\n')
            );
        }

        const filasObjetivo = filasObjetivoExcel
            .filter(row =>
                !estaVacio(row.fecha_dia)
            )
            .map(row => ({
                lt_externo:
                    entero(row.lt_externo),

                sph_objetivo:
                    entero(row.sph_objetivo),

                jph:
                    entero(row.jph),

                hrs_disponibles_dia:
                    numero(
                        row.hrs_disponibles_dia
                    ),

                jpd:
                    entero(row.jpd),

                fecha_dia:
                    fechaISO(row.fecha_dia)
            }));

        if (!filasObjetivo.length) {
            throw new Error(
                'datos_obj necesita al menos una fecha_dia.'
            );
        }

        const [cspcs] = await connection.query(
            `
            SELECT
                id_cspc,
                nombre_cspc
            FROM cspc
            `
        );

        const mapaCspcs = new Map();

        cspcs.forEach(cspc => {
            mapaCspcs.set(
                clave(cspc.nombre_cspc),
                cspc.id_cspc
            );
        });

        await connection.beginTransaction();
        transactionStarted = true;

        const resultadoDatos = await guardarDatos(
            connection,
            resultadoFilas.filas
        );

        const resultadoObjetivos =
            await guardarDatosObjetivo(
                connection,
                filasObjetivo
            );

        const resultadoPromedios =
            await guardarDatosProm(
                connection,
                filasPromExcel,
                mapaCspcs
            );

        await connection.commit();
        transactionStarted = false;

        return res.json({
            ok: true,
            message:
                'Datos importados conservando cambios manuales.',
            datos_actualizados:
                resultadoDatos.actualizados,
            datos_insertados:
                resultadoDatos.insertados,
            objetivos_actualizados:
                resultadoObjetivos.actualizados,
            objetivos_insertados:
                resultadoObjetivos.insertados,
            promedios_actualizados:
                resultadoPromedios.actualizados,
            promedios_insertados:
                resultadoPromedios.insertados,
            promedios_omitidos:
                resultadoPromedios.omitidos,
            hojas: workbook.SheetNames
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            'Error importando Datos:',
            error
        );

        return res.status(400).json({
            ok: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
}
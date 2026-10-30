import fs from 'fs'
import path from 'path'
import db from '../config/db.js'

import {
    parseProgramaExcel,
    mapBaseRow,
    validateDate
} from '../utils/programaExcelParser.js';

const BASE_COLUMNS = [
    'id_carga',
    'fila_excel',
    'id_parte',
    'reg',
    'mgo',
    'mgo_name',
    'plt',
    'sup_act_cd',
    'duns',
    'proveedor',
    'supstt',
    'supcntry',
    'numero_parte',
    'part_ver',
    'part_ecl',
    'descripcion',
    'build_seq',
    'xaltbld',
    'departamento',
    'grupo_excel',
    'xoperatn',
    'prm_uloc',
    'buy',
    'doh_excel',
    'in_transit',
    'bbal',
    'cbal',
    'total_disponible',
    'over_under',
    'ship_date',
    'last_sched_dt',
    'datos_extra'
];

const BASE_COLUMNS_SQL = BASE_COLUMNS.join(',\n');

function validateFileExtension(file) {
    if (!file) {
        throw new Error('No se recibió ningún archivo.');
    }

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (!['.xls', '.xlsx'].includes(extension)) {
        throw new Error(
            'Solo se permiten archivos .xls o .xlsx.'
        );
    }

    return extension;
}

function validateStartDate(value) {
    const date = validateDate(value);

    if (!date) {
        throw new Error(
            'La fecha debe tener formato YYYY-MM-DD.'
        );
    }

    return date;
}

function addDays(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);

    date.setUTCDate(
        date.getUTCDate() + days
    );

    return date.toISOString().slice(0, 10);
}

/*
 * Semana operativa del proyecto:
 *
 * Semana 1 = fecha_inicio_programa
 * Semana 2 = fecha_inicio_programa + 7 días
 * Semana 3 = fecha_inicio_programa + 14 días
 */
function createValueRows(
    item,
    idPrograma,
    fechaInicio,
    anioPrograma
) {
    const values = Array.isArray(item.values)
        ? item.values
        : [];

    return values.map(value => {
        const isDaily =
            value.tipo_valor === 'DREQ';

        const offset = isDaily
            ? value.periodo - 1
            : (value.periodo - 1) * 7;

        const fechaInicial = addDays(
            fechaInicio,
            offset
        );

        const fechaFinal = isDaily
            ? fechaInicial
            : addDays(fechaInicial, 6);

        const semanaPrograma =
            Math.floor(offset / 7) + 1;

        return [
            idPrograma,
            value.tipo_valor,
            value.periodo,
            fechaInicial,
            fechaFinal,
            semanaPrograma,
            Number(anioPrograma),
            value.cantidad ?? 0
        ];
    });
}

async function getPartMap(connection, items) {
    const numeros = [
        ...new Set(
            items
                .map(item =>
                    String(item.numeroParte ?? '').trim()
                )
                .filter(Boolean)
        )
    ];

    const partMap = new Map();
    const chunkSize = 500;

    for (
        let index = 0;
        index < numeros.length;
        index += chunkSize
    ) {
        const chunk = numeros.slice(
            index,
            index + chunkSize
        );

        const placeholders = chunk
            .map(() => '?')
            .join(',');

        const [rows] = await connection.query(
            `
            SELECT
                id_parte,
                numero_parte
            FROM parte
            WHERE TRIM(numero_parte)
                IN (${placeholders})
            `,
            chunk
        );

        rows.forEach(row => {
            partMap.set(
                String(row.numero_parte).trim(),
                row.id_parte
            );
        });
    }

    return partMap;
}

async function insertBaseRows(connection, rows) {
    if (!Array.isArray(rows) || !rows.length) {
        return;
    }

    const placeholdersPerRow = `(${BASE_COLUMNS
        .map(() => '?')
        .join(', ')})`;

    const chunkSize = 100;

    for (
        let index = 0;
        index < rows.length;
        index += chunkSize
    ) {
        const chunk = rows.slice(
            index,
            index + chunkSize
        );

        const placeholders = chunk
            .map(() => placeholdersPerRow)
            .join(', ');

        const values = chunk
            .flat()
            .map(value =>
                value === undefined
                    ? null
                    : value
            );

        const expected =
            chunk.length * BASE_COLUMNS.length;

        if (values.length !== expected) {
            throw new Error(
                `Cantidad incorrecta de valores. ` +
                `Recibidos: ${values.length}. ` +
                `Esperados: ${expected}.`
            );
        }

        await connection.query(
            `
            INSERT INTO programa_excel
            (
                ${BASE_COLUMNS_SQL}
            )
            VALUES ${placeholders}
            `,
            values
        );
    }
}

async function insertValueRows(connection, rows) {
    if (!Array.isArray(rows) || !rows.length) {
        return;
    }

    const chunkSize = 1000;

    for (
        let index = 0;
        index < rows.length;
        index += chunkSize
    ) {
        const chunk = rows.slice(
            index,
            index + chunkSize
        );

        const placeholders = chunk
            .map(() =>
                '(?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .join(', ');

        const values = chunk
            .flat()
            .map(value =>
                value === undefined
                    ? null
                    : value
            );

        await connection.query(
            `
            INSERT INTO programa_excel_valores
            (
                id_programa,
                tipo_valor,
                periodo,
                fecha_inicio,
                fecha_fin,
                semana,
                anio,
                cantidad
            )
            VALUES ${placeholders}
            `,
            values
        );
    }
}

export async function validarProgramaAnual(req, res) {
    try {
        const extension =
            validateFileExtension(req.file);

        const parsed = parseProgramaExcel(
            req.file.path
        );

        const [result] = await db.query(
            `
            INSERT INTO cargas_excel
            (
                nombre_archivo,
                extension,
                anio,
                fecha_corte,
                estado,
                total_filas,
                filas_validas,
                filas_error,
                usuario_carga,
                ruta_archivo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.file.originalname,
                extension,
                parsed.anio,
                parsed.fechaCorte,
                'VALIDADA',
                parsed.totalFilas,
                parsed.filasValidas,
                parsed.filasError,
                req.user?.id_usuario || null,
                req.file.path
            ]
        );

        return res.json({
            ok: true,
            id_carga: result.insertId,
            nombre_archivo: req.file.originalname,
            hoja: parsed.sheetName,
            total_filas: parsed.totalFilas,
            filas_validas: parsed.filasValidas,
            filas_error: parsed.filasError,
            fecha_corte: parsed.fechaCorte,
            anio: parsed.anio,
            errores: parsed.errores.slice(0, 100)
        });
    } catch (error) {
        if (
            req.file?.path &&
            fs.existsSync(req.file.path)
        ) {
            fs.unlinkSync(req.file.path);
        }

        console.error(
            'Error validando programa anual:',
            error
        );

        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

export async function confirmarProgramaAnual(req, res) {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const idCarga = Number(
            req.params.id_carga
        );

        const anio = Number(
            req.body?.anio
        );

        const fechaInicio = validateStartDate(
            req.body?.fecha_inicio_programa
        );

        if (!idCarga || !anio) {
            throw new Error(
                'id_carga y anio son requeridos.'
            );
        }

        if (
            !fechaInicio.startsWith(
                String(anio)
            )
        ) {
            throw new Error(
                'La fecha inicial debe pertenecer al año indicado.'
            );
        }

        const [cargas] = await connection.query(
            `
            SELECT *
            FROM cargas_excel
            WHERE id_carga = ?
            FOR UPDATE
            `,
            [idCarga]
        );

        const carga = cargas[0];

        if (!carga) {
            throw new Error(
                'La carga no existe.'
            );
        }

        if (carga.estado !== 'VALIDADA') {
            throw new Error(
                `La carga está en estado ${carga.estado}. ` +
                'Debe estar en estado VALIDADA.'
            );
        }

        if (
            !carga.ruta_archivo ||
            !fs.existsSync(carga.ruta_archivo)
        ) {
            throw new Error(
                'No se encontró el archivo temporal de la carga.'
            );
        }

        const parsed = parseProgramaExcel(
            carga.ruta_archivo
        );

        if (parsed.filasError > 0) {
            throw new Error(
                `El archivo tiene ${parsed.filasError} ` +
                'filas con error.'
            );
        }

        if (!parsed.filasValidas) {
            throw new Error(
                'El archivo no contiene filas válidas.'
            );
        }

        /*
         * Elimina información de intentos anteriores
         * de la misma carga.
         */
        await connection.query(
            `
            DELETE FROM programa_excel
            WHERE id_carga = ?
            `,
            [idCarga]
        );

        await connection.query(
            `
            UPDATE cargas_excel
            SET
                anio = ?,
                fecha_inicio_programa = ?,
                estado = 'PENDIENTE'
            WHERE id_carga = ?
            `,
            [
                anio,
                fechaInicio,
                idCarga
            ]
        );

        const partMap = await getPartMap(
            connection,
            parsed.rows
        );

        const baseRows = parsed.rows.map(item => {
            const numeroParte = String(
                item.numeroParte ?? ''
            ).trim();

            const idParte =
                partMap.get(numeroParte) || null;

            return mapBaseRow(
                item,
                idCarga,
                idParte
            ).map(value =>
                value === undefined
                    ? null
                    : value
            );
        });

        await insertBaseRows(
            connection,
            baseRows
        );

        const [insertedRows] =
            await connection.query(
                `
                SELECT
                    id_programa,
                    fila_excel
                FROM programa_excel
                WHERE id_carga = ?
                `,
                [idCarga]
            );

        const programMap = new Map(
            insertedRows.map(row => [
                Number(row.fila_excel),
                row.id_programa
            ])
        );

        const valueRows = [];

        parsed.rows.forEach(item => {
            const idPrograma =
                programMap.get(
                    Number(item.fila_excel)
                );

            if (!idPrograma) return;

            /*
             * Aquí se envía anio correctamente.
             */
            valueRows.push(
                ...createValueRows(
                    item,
                    idPrograma,
                    fechaInicio,
                    anio
                )
            );
        });

        await insertValueRows(
            connection,
            valueRows
        );

        await connection.query(
            `
            UPDATE cargas_excel
            SET estado = 'HISTORICA'
            WHERE estado = 'ACTIVA'
              AND id_carga <> ?
            `,
            [idCarga]
        );

        await connection.query(
            `
            UPDATE cargas_excel
            SET
                estado = 'ACTIVA',
                activated_at = NOW()
            WHERE id_carga = ?
            `,
            [idCarga]
        );

        await connection.commit();
        transactionStarted = false;

        return res.json({
            ok: true,
            message:
                'Programa anual importado y activado correctamente.',
            id_carga: idCarga,
            filas_importadas: parsed.filasValidas,
            valores_importados: valueRows.length,
            partes_relacionadas: partMap.size,
            semana_inicial: 1,
            fecha_inicial: fechaInicio
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            'Error confirmando programa anual:',
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

export async function listarCargasPrograma(req, res) {
    try {
        const [rows] = await db.query(
            `
            SELECT
                id_carga,
                nombre_archivo,
                extension,
                anio,
                fecha_corte,
                fecha_inicio_programa,
                estado,
                total_filas,
                filas_validas,
                filas_error,
                created_at,
                activated_at
            FROM cargas_excel
            ORDER BY created_at DESC
            `
        );

        return res.json(rows);
    } catch (error) {
        console.error(
            'Error listando cargas:',
            error
        );

        return res.status(500).json({
            ok: false,
            message:
                'Error al consultar historial de cargas.'
        });
    }
}

export async function activarCargaPrograma(req, res) {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        const idCarga = Number(
            req.params.id_carga
        );

        if (!idCarga) {
            throw new Error(
                'Carga inválida.'
            );
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [rows] = await connection.query(
            `
            SELECT id_carga
            FROM cargas_excel
            WHERE id_carga = ?
            FOR UPDATE
            `,
            [idCarga]
        );

        if (!rows.length) {
            throw new Error(
                'La carga no existe.'
            );
        }

        await connection.query(
            `
            UPDATE cargas_excel
            SET estado = 'HISTORICA'
            WHERE estado = 'ACTIVA'
              AND id_carga <> ?
            `,
            [idCarga]
        );

        await connection.query(
            `
            UPDATE cargas_excel
            SET
                estado = 'ACTIVA',
                activated_at = NOW()
            WHERE id_carga = ?
            `,
            [idCarga]
        );

        await connection.commit();
        transactionStarted = false;

        return res.json({
            ok: true,
            message: 'Carga activada correctamente.'
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            'Error activando carga:',
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
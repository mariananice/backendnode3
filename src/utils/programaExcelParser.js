import XLSX from 'xlsx'

const PREFIXES = ['DREQ', 'WREQ', 'SCHDWK'];

function normalizeHeader(value) {
    return String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');
}

function uniqueHeaders(headers) {
    const counters = {};

    return headers.map((header, index) => {
        const base = header || `COL_${index + 1}`;

        counters[base] = (counters[base] || 0) + 1;

        return counters[base] === 1
            ? base
            : `${base}_${counters[base]}`;
    });
}

function parseExcelDate(value) {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();

    if (/^\d{8}$/.test(text)) {
        return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    if (typeof value === 'number' && value > 30000 && value < 70000) {
        const date = new Date(
            Date.UTC(1899, 11, 30) + value * 86400000
        );

        return date.toISOString().slice(0, 10);
    }

    return null;
}

function parseNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value)
        .trim()
        .replace(/,/g, '');

    if (!text || text === '-') {
        return null;
    }

    const number = Number(text);

    return Number.isFinite(number) ? number : null;
}

function cellValue(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return value ?? null;
}

function findHeaderRow(matrix) {
    let bestIndex = -1;
    let bestScore = 0;

    matrix.slice(0, 30).forEach((row, index) => {
        const headers = row.map(normalizeHeader);

        let score = 0;

        if (headers.includes('PART')) score += 3;
        if (headers.includes('SUPNM')) score += 1;
        if (headers.includes('DREQ1')) score += 1;
        if (headers.includes('WREQ1')) score += 1;
        if (headers.includes('SCHDWK1')) score += 1;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function buildRow(headers, values) {
    const row = {};

    headers.forEach((header, index) => {
        row[header] = cellValue(values[index]);
    });

    return row;
}

function getRelevantValues(row) {
    const values = [];

    for (const prefix of PREFIXES) {
        for (let periodo = 1; periodo <= (prefix === 'DREQ' ? 20 : 40); periodo++) {
            const key = `${prefix}${periodo}`;

            if (!(key in row)) continue;

            const cantidad = parseNumber(row[key]);

            if (cantidad === null) continue;

            values.push({
                tipo_valor: prefix,
                periodo,
                cantidad
            });
        }
    }

    return values;
}

export function parseProgramaExcel(filePath) {
    const workbook = XLSX.readFile(filePath, {
        cellDates: true
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        throw new Error('No se encontró una hoja válida.');
    }

    const matrix = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: true
    });

    const headerIndex = findHeaderRow(matrix);

    if (headerIndex === -1) {
        throw new Error('No se encontró la fila de encabezados.');
    }

    const headers = uniqueHeaders(
        matrix[headerIndex].map(normalizeHeader)
    );

    const missingHeaders = [];

    if (!headers.includes('PART')) {
        missingHeaders.push('PART');
    }

    const hasScheduleColumns = headers.some(header =>
        /^(DREQ|WREQ|SCHDWK)1$/.test(header)
    );

    if (!hasScheduleColumns) {
        missingHeaders.push('DREQ1, WREQ1 o SCHDWK1');
    }

    if (missingHeaders.length) {
        throw new Error(
            `Faltan encabezados requeridos: ${missingHeaders.join(', ')}`
        );
    }

    const rows = [];
    const errores = [];

    matrix
        .slice(headerIndex + 1)
        .forEach((values, index) => {
            const filaExcel = headerIndex + index + 2;
            const row = buildRow(headers, values);
            const numeroParte = String(row.PART ?? '').trim();

            const emptyRow = Object.values(row).every(
                value => value === null || String(value).trim() === ''
            );

            if (emptyRow) return;

            if (!numeroParte) {
                errores.push({
                    fila: filaExcel,
                    campo: 'PART',
                    mensaje: 'La fila no contiene número de parte.'
                });

                return;
            }

            rows.push({
                fila_excel: filaExcel,
                row,
                numeroParte,
                values: getRelevantValues(row)
            });
        });

    const firstRow = rows[0]?.row || {};

    const fechaCorte =
        parseExcelDate(firstRow['LAST SCHED DT']) ||
        parseExcelDate(firstRow['SHIP DATE']);

    const anio = fechaCorte
        ? Number(fechaCorte.slice(0, 4))
        : null;

    return {
        sheetName,
        headers,
        rows,
        errores,
        totalFilas: rows.length + errores.length,
        filasValidas: rows.length,
        filasError: errores.length,
        fechaCorte,
        anio
    };
}

export function mapBaseRow(item, idCarga, idParte = null) {
    const row = item.row;

    return [
        idCarga,
        item.fila_excel,
        idParte,

        row.REG,
        row.MGO,
        row['MGO NAME'],
        row.PLT,
        row['SUP ACT CD'],
        row.DUNS,
        row.SUPNM,
        row.SUPSTT,
        row.SUPCNTRY,

        item.numeroParte,
        row['PART VER'],
        row['PART ECL'],
        row.XABBNAME,

        row['BUILD SEQ'],
        row.XALTBLD,
        row.DEPARTMENT,
        row.GROUP,
        row.XOPERATN,
        row['PRM ULOC'],

        row.BUY,
        parseNumber(row.DOH),
        parseNumber(row['IN TRANSIT']),
        parseNumber(row.BBAL),
        parseNumber(row.CBAL),
        parseNumber(row['TOT AVAIL']),
        parseNumber(row['OVER/UNDER']),

        parseExcelDate(row['SHIP DATE']),
        parseExcelDate(row['LAST SCHED DT']),

        JSON.stringify(row)
    ];
}

export function parseNumberForImport(value) {
    return parseNumber(value);
}

export function validateDate(value) {
    return parseExcelDate(value);
}
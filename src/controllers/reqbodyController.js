import fs from 'fs'
import XLSX from 'xlsx'
import db from '../config/db.js'

const normalizeKey = (value = '') => 
    value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

const toInt = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
};

const toDecimal = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
};

const getPeriodo = (key) => {
    const match = key.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
};

export const importReqbodyExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

        const rows = rawRows.map((row) => {
            const cleanRow = {};
            for (const [key, value] of Object.entries(row)) {
                cleanRow[normalizeKey(key)] = value;
            }
            return cleanRow;
        });

        const values = [];

        for (const row of rows) {
            const numero_parte = row.part?.toString().trim();
            if (!numero_parte) continue;

            const descripcion = row.xabbname ?? null;
            const uloc = row.prm_uloc ?? null;
            const buy_cantidad = toInt(row.buy);
            const doh = toDecimal(row.doh);
            const in_transit = toInt(row.in_transit);
            const cbal = toInt(row.cbal);

            for (const [key,  value] of Object.entries(row)) {
                if (value === null || value === undefined || value === '') continue;

                let tipo_req = null;

                if (/^dreq\d+$/i.test(key)) tipo_req = 'DREQ';
                else if (/^wreq\d+$/i.test(key)) tipo_req = 'WREQ';
                else if (/^schdwk\d+$/i.test(key)) tipo_req = 'SCHDWK';

                if (!tipo_req) continue;

                const periodo = getPeriodo(key);
                const cantidad = toInt(value);

                if (!periodo || cantidad === null) continue;

                values.push([
                    numero_parte,
                    descripcion,
                    uloc,
                    buy_cantidad,
                    doh,
                    in_transit,
                    cbal,
                    tipo_req,
                    periodo,
                    cantidad
                ]);
            }
        }

        if (!values.length) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'No hubo datos para guardar' });
        }

        const sql = `
            INSERT INTO reqbody_import
            (
                numero_parte,
                descripcion,
                uloc,
                buy_cantidad,
                doh,
                in_transit,
                cbal,
                tipo_req,
                periodo,
                cantidad
            )
            VALUES ?
            ON DUPLICATE KEY UPDATE
                descripcion = VALUES(descripcion),
                uloc = VALUES(uloc),
                buy_cantidad = VALUES(buy_cantidad),
                doh = VALUES(doh),
                in_transit = VALUES(in_transit),
                cbal = VALUES(cbal),
                cantidad = VALUES(cantidad),
                updated_at = CURRENT_TIMESTAMP
            `;

        await db.query(sql, [values]);

        fs.unlinkSync(req.file.path);

        return res.json({
            message: 'REQBODY importado correctamente',
            registros: values.length
        });
    } catch (error) {
        console.error('Error en importReqbodyExcel:', error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: error.message });
    }
};

export const getReqbody = async (req, res) => {
    try {
        const tipo = req.query.tipo || 'DREQ';
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
        const offset = (page - 1) * limit;
        const numeroParte = (req.query.numero_parte || '').trim();

        let where = 'WHERE tipo_req = ?';
        const params = [tipo];

        if (numeroParte) {
            where += ' AND numero_parte LIKE ?';
            params.push(`%${numeroParte}%`);
        }

        const [[countRow]] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM reqbody_import
            ${where}
            `,
            params
        );

        const [rows] = await db.query(
            `
            SELECT
                numero_parte,
                descripcion,
                uloc,
                buy_cantidad,
                doh,
                in_transit,
                cbal,
                tipo_req,
                periodo,
                cantidad
            FROM reqbody_import
            ${where}
            ORDER BY numero_parte, periodo
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        return res.json({
            data: rows,
            pagination: {
                total: countRow.total,
                page,
                limit,
                totalPages: Math.ceil(countRow.total / limit)
            }
        });
    } catch (error) {
         console.error('Error en getReqbody:', error);
        return res.status(500).json({ message: error.message });
    }
};

export const generarReqbodyDiario = async (req, res) => {
  try {
    const { semana, anio } = req.body;

    if (!semana || !anio) {
      return res.status(400).json({
        message: 'semana y anio son requeridos'
      });
    }

    // 1) calcular fecha_base = miércoles de esa semana ISO (semana en 2 dígitos)
    const [[{ fecha_base }]] = await db.query(
      `
      SELECT STR_TO_DATE(
               CONCAT(?, LPAD(?, 2, '0'), '3'),
               '%X%V%w'
             ) AS fecha_base
      `,
      [anio, semana]
    );

    if (!fecha_base) {
      return res.status(400).json({ message: 'Semana/año inválidos' });
    }

    // 2) limpiar esa semana en reqbody
    await db.query(
      `DELETE FROM reqbody
       WHERE semana = ? AND anio = ?`,
      [semana, anio]
    );

    // 3) insertar diario usando DREQ y esa fecha_base
    await db.query(
      `
      INSERT INTO reqbody
      (id_parte, id_cspc, linea, fecha, cantidad, semana, anio)
      SELECT
          p.id_parte,
          p.id_cspc,
          p.linea,
          DATE_ADD(?, INTERVAL (i.periodo - 1) DAY) AS fecha,
          i.cantidad,
          ? AS semana,
          ? AS anio
      FROM reqbody_import i
      JOIN parte p
        ON p.numero_parte = i.numero_parte
      WHERE i.tipo_req = 'DREQ'
      `,
      [fecha_base, semana, anio]
    );

    return res.json({
      message: 'reqbody generado correctamente a partir de reqbody_import (DREQ)',
      semana,
      anio,
      fecha_base
    });
  } catch (error) {
    console.error('Error al generar reqbody:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Devolver reqbody diario de una semana (para Estampado)
export const getReqbodyDiarioSemana = async (req, res) => {
  try {
    const semana = parseInt(req.query.semana, 10) || null;
    const anio = parseInt(req.query.anio, 10) || null;

    if (!semana || !anio) {
      return res.status(400).json({
        message: 'semana y anio son requeridos en query (ej. ?semana=30&anio=2026)'
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id_reqbody,
        r.fecha,
        r.cantidad,
        r.semana,
        r.anio,
        p.numero_parte,
        p.modelo,
        p.linea,
        c.nombre_cspc
      FROM reqbody r
      JOIN parte p   ON r.id_parte = p.id_parte
      JOIN cspc  c   ON r.id_cspc = c.id_cspc
      WHERE r.semana = ? AND r.anio = ?
      ORDER BY p.numero_parte, r.fecha
      `,
      [semana, anio]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Error en getReqbodyDiarioSemana:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Resumen semanal por parte/CSPC (suma de cantidad en reqbody)
export const getReqbodyResumenSemana = async (req, res) => {
  try {
    const semana = parseInt(req.query.semana, 10) || null;
    const anio = parseInt(req.query.anio, 10) || null;

    if (!semana || !anio) {
      return res.status(400).json({
        message: 'semana y anio son requeridos en query (ej. ?semana=30&anio=2026)'
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        r.id_parte,
        p.numero_parte,
        c.nombre_cspc,
        p.linea,
        r.semana,
        r.anio,
        SUM(r.cantidad) AS cantidad_semanal
      FROM reqbody r
      JOIN parte p ON r.id_parte = p.id_parte
      JOIN cspc  c ON r.id_cspc = c.id_cspc
      WHERE r.semana = ? AND r.anio = ?
      GROUP BY r.id_parte, p.numero_parte, c.nombre_cspc, p.linea, r.semana, r.anio
      ORDER BY p.numero_parte
      `,
      [semana, anio]
    );

    return res.json(rows);
  } catch (error) {
    console.error('Error en getReqbodyResumenSemana:', error);
    return res.status(500).json({ message: error.message });
  }
};

/*export const getReqbody = async (req, res) => {
    try {
        const tipo = req.query.tipo || 'DREQ';

        const [rows] = await db.query(
            `
            SELECT
                numero_parte,
                descripcion,
                uloc,
                buy_cantidad,
                doh,
                in_transit,
                cbal,
                tipo_req,
                periodo,
                cantidad
            FROM reqbody_import
            WHERE tipo_req = ?
            ORDER BY numero_parte, periodo
            `,
            [tipo]
        );

        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}*/

/*export const uploadReqBody = (req, res) => {
    const workbook = XLSX.readFile(req.file.path);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json(sheet);

    data.forEach(row => {
        const query = `
            INSERT INTO reqbody
            (id_parte, id_cspc, linea, fecha, cantidad)
            VALUES (?,?,?,?,?)
        `
        db.query(query, [
            row.id_parte,
            row.id_cspc,
            row.linea,
            row.fecha,
            row.cantidad
        ]);
    });

    res.json({ message: 'ReqBody cargado correctamente'});
};*/
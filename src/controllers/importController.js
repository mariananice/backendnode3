import fs from 'fs'
import db from '../config/db.js'
import { parseExcel } from '../utils/excelParser.js'

const clean = (value) => (value ?? '').toString().trim();
const toInt = (value) => Number.parseInt(value, 10);

const deleteTempFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

export const importCspcExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo' });
        }

        const rows = parseExcel(req.file.path);
        //console.log('Filas leídas: ', rows.length);
        //console.log('Primera fila cruda: ', rows[0]);
        //console.log('Primera fila:', rows[0]);
        //console.log('Segunda fila:', rows[1]);
        //console.log('Tercera fila:', rows[2]);

        if (!rows.length) {
            deleteTempFile(req.file.path);
            return res.status(400).json({ message: 'El archivo está vacio' });
        }

        let insertadas = 0;
        let actualizadas = 0;
        let omitidas = 0;
        const errores = [];

        for (const row of rows) {
            //console.log('Fila actual: ', row);

            const numero_parte = clean(row.numero_parte);
            const nombre_cspc = clean(row.nombre_cspc);
            const linea = clean(row.linea).toUpperCase();
            //const sph_cspc = toInt(row.sph_cspc);

            const sphRaw = clean(row.sph_cspc);
            //const sph_cspc = sphRaw === '' ? 0 : toInt(sphRaw);
            const sph_cspc = sphRaw === '' ? 0 : Number.parseInt(sphRaw, 10);

            //console.log({
                //numero_parte,
                //nombre_cspc,
                //linea,
                //sph_cspc,
                //sphOriginal: row.sph_cspc
            //});

            if (!numero_parte || !nombre_cspc) { //|| !linea || Number.isNaN(sph_cspc)) {
                //console.log('Fila omitida por campos base: ', row);
                omitidas++;
                errores.push({ row, error: 'Faltan campos base' });
                continue;
            }

            if (!['XL1', 'XL2', '0'].includes(linea)) {
                //console.log('Fila omitida por línea inválida:', row);
                omitidas++;
                errores.push({ row, error: 'Línea inválida' });
                continue;
            }

            if (Number.isNaN(sph_cspc)) {
                //console.log('Fila omitida por sph inválido:', row);
                omitidas++;
                errores.push({ row, error: 'sph_cspc inválido' });
                continue;
            }

            const [existenteRows] = await db.query(
                `SELECT id_cspc, nombre_cspc, linea, sph_cspc
                FROM cspc
                WHERE numero_parte = ?
                LIMIT 1`,
                [numero_parte]
            );

            if (!existenteRows.length) {
                await db.query(
                    `INSERT INTO cspc (numero_parte, nombre_cspc, linea, sph_cspc)
                    VALUES (?, ?, ?, ?,)`,
                    [numero_parte, nombre_cspc, linea, sph_cspc]
                );
                insertadas++;
                continue;
            }

            const existente = existenteRows[0];

            const cambio = 
                existente.nombre_cspc !== nombre_cspc ||
                existente.linea !== linea ||
                Number(existente.sph_cspc) !== sph_cspc;

            if (!cambio) {
                omitidas++;
                continue;
            }

            await db.query(
                `UPDATE cspc
                SET nombre_cspc = ?, linea = ?, sph_cspc = ?
                WHERE numero_parte = ?`,
                [nombre_cspc, linea, sph_cspc, numero_parte]
            );
            actualizadas++;

            //await db.query(
                //`INSERT INTO cspc (numero_parte, nombre_cspc, linea, sph_cspc)
                //VALUES (?, ?, ?, ?)
                //ON DUPLICATE KEY UPDATE
                //nombre_cspc = VALUES(nombre_cspc),
                //linea = VALUES(linea),
                //sph_cspc = VALUES(sph_cspc)`,
                //[numero_parte, nombre_cspc, linea, sph_cspc]
            //);

            //insertadas++;
            //console.log('Fila insertada');
        }

        deleteTempFile(req.file.path);

        return res.json({
            message: 'CSPC importado correctamente',
            totalFilas: rows.length,
            insertadas,
            actualizadas,
            omitidas,
            errores
        });
    } catch (error) {
        console.error('error al importar CSPC: ', error);
        deleteTempFile(req.file?.path);
        return res.status(500).json({ message: error.message });
    }
};

export const importParteExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo' });
        }

        const rows = parseExcel(req.file.path);

        //console.log('Filas leídas PARTE: ', rows.length);
        //console.log('Primera fila PARTE: ', rows[0]);

        if (!rows.length) {
            deleteTempFile(req.file.path);
            return res.status(400).json({ message: 'El archivo está vacío' });
        }

        let insertadas = 0;
        let actualizadas = 0;
        let omitidas = 0;
        const errores = [];

        for (const row of rows) {
            //console.log('Fila actual PARTE:', row);

            const nombre_parte = clean(row.nombre_parte);
            const numero_parte = clean(row.numero_parte);
            const modelo = clean(row.modelo);
            const strokes = clean(row.strokes);
            const linea = clean(row.linea).toUpperCase();

            //console.log({
                //nombre_parte,
                //numero_parte,
                //modelo,
                //strokes,
                //linea
            //});

            if (!nombre_parte || !numero_parte || !modelo) {
                //console.log('Fila omitida por campos base: ', row);
                omitidas++;
                errores.push({ row, error: 'Faltan campos base' });
                continue;
            }

            if (!['1', '2'].includes(strokes)) {
                //console.log('Fila omitida por strokes inválido:', row);
                omitidas++;
                errores.push({ row, error: 'strokes inválido, solo se permite 1 o 2' });
                continue;
            }

            if (!['XL1', 'XL2', '0'].includes(linea)) {
                //console.log('Fila omitida por línea inválida: ', row);
                omitidas++;
                errores.push({ row, error: 'linea inválida' });
                continue;
            }

            const [cspcRows] = await db.query(
                `SELECT id_cspc
                FROM cspc
                WHERE numero_parte = ?
                LIMIT 1`,
                [numero_parte]
            );

            if (!cspcRows.length) {
                //console.log('No se encontró id_cspc para: ', numero_parte);
                omitidas++;
                errores.push({ row, error: `No se encontró id_cspc para numero_parte ${numero_parte}` });
                continue;
            }

            const id_cspc = cspcRows[0].id_cspc;

            const [existenteRows] = await db.query(
                `SELECT id_parte, nombre_parte, id_cspc, modelo, strokes, linea
                FROM parte
                WHERE numero_parte = ?
                LIMIT 1`,
                [numero_parte]
            );

            if (!existenteRows.length) {
                await db.query(
                    `INSERT INTO parte (nombre_parte, id_cspc, numero_parte, modelo, strokes, linea)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [nombre_parte, id_cspc, numero_parte, modelo, strokes, linea]
                );
                insertadas++;
                continue;
            }

            const cambio =
                existenteRows.nombre_parte !== nombre_parte ||
                Number(existenteRows.id_cspc) !== id_cspc ||
                existente.modelo !== modelo ||
                String(existente.strokes) !== String(strokes) ||
                existente.linea !== linea;

            if (!cambio) {
                omitidas++;
                continue;
            }

            await db.query(
                `UPDATE parte
                SET nombre_parte = ?, id_cspc = ?, modelo = ?, strokes = ?, linea = ?
                WHERE nombre_parte = ?,`
                [nombre_parte, id_cspc, modelo, strokes, linea, existenteRows[0].nombre_parte]
            );

            actualizadas++;
 
            //await db.query(
                //`INSERT INTO parte (nombre_parte, id_cspc, numero_parte, modelo, strokes, linea)
                //VALUES (?, ?, ?, ?, ?, ?)
                //ON DUPLICATE KEY UPDATE
                    //nombre_parte = VALUES(nombre_parte),
                    //id_cspc = VALUES(id_cspc),
                    //modelo = VALUES(modelo),
                    //strokes = VALUES(strokes),
                    //linea = VALUES(linea)`,
                //[nombre_parte, id_cspc, numero_parte, modelo, strokes, linea]
            //);

            //insertadas++;
            //console.log('Fila insertada en PARTE');
        }

        deleteTempFile(req.file.path);

        return res.json({
            message: 'PARTE importado correctamente',
            totalFilas: rows.length,
            insertadas,
            actualizadas,
            omitidas,
            errores
        });
    } catch (error) {
        console.error('Error al importar PARTE:', error);
        deleteTempFile(req.file?.path);
        res.status(500).json({ message: error.message });
    }
};

export const importDohExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo' });
        }

        const rows = parseExcel(req.file.path);

        //console.log('Filas leídas DOH:', rows.length);
        //console.log('Primera fila DOH:', rows[0]);

        if (!rows.length) {
            deleteTempFile(req.file.path);
            return res.status(400).json({ message: 'El archivo está vacío' });
        }

        let insertadas = 0;
        let actualizadas = 0;
        let omitidas = 0;
        const errores = [];

        for (const row of rows) {
            //console.log('Fila actual DOH:', row);

            const nombre_cspc = clean(row.nombre_cspc || row.cspc);
            const linea = clean(row.linea).toUpperCase();
            const capacidadRaw = clean(row.capacidad_total);
            const capacidad_total = capacidadRaw === '' ? 0 : Number.parseInt(capacidadRaw, 10);
            //const capacidad_total = capacidadRaw === '' ? 0 : toInt(capacidadRaw);

            if (!nombre_cspc) {
                omitidas++;
                errores.push({ row, error: 'nombre_cspc vacío' });
                continue;
            }

            if (!['XL1', 'XL2', '0'].includes(linea)) {
                omitidas++;
                errores.push({ row, error: 'linea inválida' });
                continue;
            }

            if (Number.isNaN(capacidad_total)) {
                omitidas++;
                errores.push({ row, error: 'capacidad_total inválida' });
                continue;
            }

            const [cspcRows] = await db.query(
                `SELECT id_cspc
                FROM cspc
                WHERE nombre_cspc = ?
                LIMIT 1`,
                [nombre_cspc]
            );

            if (!cspcRows.length) {
                omitidas++;
                errores.push({
                    row,
                    error: `No se encontró id_cspc para CSPC ${nombre_cspc}`
                });
                continue;
            }

            const id_cspc = cspcRows[0].id_cspc;

            const [existenteRows] = await db.query(
                `SELECT id_doh, capacidad_total
                FROM doh
                WHERE id_cspc = ? AND linea = ?
                LIMIT 1`,
                [id_cspc, linea]
            );

            if (!existenteRows.length) {
                await db.query(
                    `INSERT INTO doh (id_cspc, linea, capacidad_total)
                    VALUES (?, ?, ?)`,
                    [id_cspc, linea, capacidad_total]
                );
                insertadas++;
                continue;
            }

            const existente = existenteRows[0];

            if (Number(existente.capacidad_total) === capacidad_total) {
                omitidas++;
                continue;
            }

            await db.query(
                `UPDATE doh
                SET capacidad_total = ?
                WHERE id_cspc = ? AND linea = ?`,
                [capacidad_total, id_cspc, linea]
            );
            actualizadas++;

            //await db.query(
                //`INSERT INTO doh (id_cspc, linea, capacidad_total)
                //VALUES (?, ?, ?)
                //ON DUPLICATE KEY UPDATE
                    //capacidad_total = VALUES(capcidad_total)`,
                //[id_cspc, linea, capacidad_total]
            //);

            //insertadas++;
            //console.log('Fila insertada en DOH');
        }

        deleteTempFile(req.file.path);

        return res.json({
            message: 'DOH importado correctamente',
            totalFilasExcel: rows.length,
            insertadas,
            actualizadas,
            omitidas,
            errores
        });
    } catch (error) {
        console.error('Error al importar DOH: ', error);
        deleteTempFile(req.file?.path);
        res.status(500).json({ message: error.message });
    }
};

export const previewReqbodyExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió archivo' });
        }

        const rows = parseExcel(req.file.path);

        if (!rows.length) {
            deleteTempFile(req.file.path);
            return res.status(400).json({ message: 'El archivo está vacío' });
        }

        const primeraFila = rows[0];
        const columnas = Object.keys(primeraFila);

        const columnasDreq = columnas.filter(col => /^dreq\d+$/i.test(col));
        const columnasWreq = columnas.filter(col => /^wreq\d+$/i.test(col));
        const columnasSchd = columnas.filter(col => /^schdwk\d+$/i.test(col));

        const preview = [];

        for (const row of rows.slice(0, 5)) {
            const nombre_cspc = clean(row.cspc || row.nombre_cspc || row.xabbname);
            const numero_parte = clean(row.part || row.numero_parte);
            const proveedor = clean(row.supnm);
            const ubicacion = clean(row.prm_uloc);

            columnasDreq.forEach(col => {
                const cantidad = Number.parseInt(clean(row[col]), 10);
                if (!Number.isNaN(cantidad) && cantidad > 0) {
                    preview.push({
                        tipo: 'DREQ',
                        periodo: col.toUpperCase(),
                        nombre_cspc,
                        numero_parte,
                        proveedor,
                        ubicacion,
                        cantidad
                    });
                }
            });

            columnasWreq.forEach(col => {
                const cantidad = Number.parseInt(clean(row[col]), 10);
                if (!Number.isNaN(cantidad) && cantidad > 0) {
                    preview.push({
                        tipo: 'WREQ',
                        periodo: col.toUpperCase(),
                        nombre_cspc,
                        numero_parte,
                        proveedor,
                        ubicacion,
                        cantidad
                    });
                }
            });

            columnasSchd.forEach(col => {
                const cantidad = Number.parseInt(clean(row[col]), 10);
                if (!Number.isNaN(cantidad) && cantidad > 0) {
                    preview.push({
                        tipo: 'SCHDWK',
                        periodo: col.toUpperCase(),
                        nombre_cspc,
                        numero_parte,
                        proveedor,
                        ubicacion,
                        cantidad
                    });
                }
            });
        }

        deleteTempFile(req.file.path);

        return res.json({
            message: 'Vista previa de reqbody generada correctamente',
            columnasDetectadas: columnas,
            columnasDreq,
            columnasWreq,
            columnasSchd,
            muestra: preview.slice(0, 50)
        });
    } catch (error) {
        console.log('Error al previsualizar REQBODY:', error);
        deleteTempFile(req.file?.path);
        return res.status(500).json({ message: error.message });
    }
};
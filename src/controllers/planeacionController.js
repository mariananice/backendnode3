import {
    obtenerPlaneacion as consultarPlaneacion,
    crearPlaneacion as insertarPlaneacion,
    obtenerPartes as consultarPartes,
    eliminarPlaneacion as borrarPlaneacion
} from '../services/planeacionService.js';

export const obtenerPlaneacion = async (
    req,
    res
) => {
    const { fecha, linea } =
        req.query;

    if (!fecha || !linea) {
        return res.status(400).json({
            ok: false,
            mensaje:
                'Los parámetros fecha y linea son obligatorios'
        });
    }

    try {
        const filas =
            await consultarPlaneacion(
                fecha,
                String(linea)
                    .trim()
                    .toUpperCase()
            );

        res.json({
            ok: true,
            fecha,
            linea,
            filas
        });
    } catch (error) {
        console.error(
            'Error en Planeación:',
            error
        );

        res.status(500).json({
            ok: false,
            mensaje:
                'Error al consultar Planeación',
            error: error.message
        });
    }
};

export const crearPlaneacion = async (
    req,
    res
) => {
    try {
        let {
            id_parte,
            linea,
            hora,
            cantidad_planeada,
            fecha
        } = req.body;

        id_parte =
            Number(id_parte);

        cantidad_planeada =
            Number(cantidad_planeada);

        linea =
            String(linea || '')
                .trim()
                .toUpperCase();

        hora =
            String(hora || '')
                .trim();

        fecha =
            String(fecha || '')
                .trim();

        if (
            !Number.isInteger(id_parte) ||
            id_parte <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    'id_parte debe ser un número válido'
            });
        }

        if (
            !['XL1', 'XL2'].includes(linea)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    'La línea debe ser XL1 o XL2'
            });
        }

        if (
            !/^\d{2}:\d{2}(:\d{2})?$/
                .test(hora)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    'La hora debe tener formato HH:mm o HH:mm:ss'
            });
        }

        if (hora.length === 5) {
            hora = `${hora}:00`;
        }

        if (
            !Number.isFinite(
                cantidad_planeada
            ) ||
            cantidad_planeada <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    'cantidad_planeada debe ser mayor que cero'
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(fecha)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    'La fecha debe tener formato YYYY-MM-DD'
            });
        }

        const planeacion =
            await insertarPlaneacion({
                id_parte,
                linea,
                hora,
                cantidad_planeada,
                fecha
            });

        res.status(201).json({
            ok: true,
            mensaje:
                'Planeación creada correctamente',
            planeacion
        });
    } catch (error) {
        console.error(
            'Error al crear Planeación:',
            error
        );

        const status =
            error.statusCode ||
            (
                error.code === 'ER_DUP_ENTRY'
                    ? 409
                    : 500
            );

        res.status(status).json({
            ok: false,
            mensaje: error.message
        });
    }
};

export const obtenerPartes = async (
    req,
    res
) => {
    try {
        const partes =
            await consultarPartes();

        res.json({
            ok: true,
            partes
        });
    } catch (error) {
        console.error(
            'Error al consultar partes:',
            error
        );

        res.status(500).json({
            ok: false,
            mensaje:
                'No fue posible consultar las partes',
            error: error.message
        });
    }
};

export const eliminarPlaneacion = async (
    req,
    res
) => {
    const id_planeacion =
        Number(req.params.id);

    if (
        !Number.isSafeInteger(id_planeacion) ||
        id_planeacion <= 0
    ) {
        return res.status(400).json({
            ok: false,
            mensaje:
                'El ID de planeación no es válido'
        });
    }

    try {
        const planeacion =
            await borrarPlaneacion(
                id_planeacion
            );

        return res.json({
            ok: true,
            mensaje:
                'Planeación eliminada correctamente',
            planeacion
        });
    } catch (error) {
        console.error(
            'Error al eliminar Planeación:',
            error
        );

        const registrosDependientes =
            error.code ===
            'ER_ROW_IS_REFERENCED_2';

        const status =
            error.statusCode ||
            (registrosDependientes ? 409 : 500);

        return res.status(status).json({
            ok: false,
            mensaje: registrosDependientes
                ? 'No se puede eliminar porque otros registros dependen de esta planeación'
                : error.statusCode
                    ? error.message
                    : 'No fue posible eliminar la planeación'
        });
    }
};
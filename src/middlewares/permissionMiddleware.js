export const canEditUser = (req, res, next) => {
    //if (!req.user) {
    //    return res.status(401).json({ message: 'Usuario no autenticado' });
    //}

    const userIdFromToken = req.user.id_usuario;
    const userIdFromParams = parseInt(req.params.id);

    if (req.user_rol == 'admin') {
        return next();
    }

    if (userIdFromToken === userIdFromParams) {
        return next();
    }

    return res.status(403).json({
        message: 'No tienes permiso para editar este usuario',
    });
}
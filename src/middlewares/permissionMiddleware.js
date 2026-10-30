export const canEditUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const userIdFromToken = req.user.id; // del token (id)
    const userIdFromParams = parseInt(req.params.id, 10); // de la URL
    const userRol = req.user.rol; // rol del token

    // Si es admin, puede editar a cualquiera
    if (userRol === 'admin') {
        return next();
    }

    // Si es el mismo usuario, puede editarse a sí mismo
    if (userIdFromToken === userIdFromParams) {
        return next();
    }

    return res.status(403).json({
        message: 'No tienes permiso para editar este usuario',
    });
}

/*export const canEditUser = (req, res, next) => {
    //if (!req.user) {
    //    return res.status(401).json({ message: 'Usuario no autenticado' });
    //}

    const userIdFromToken = req.user.id_usuario; // del token
    const userIdFromParams = parseInt(req.params.id); // de la URL

    if (req.user_rol == 'admin') {
        return next();
    }

    if (userIdFromToken === userIdFromParams) {
        return next();
    }

    return res.status(403).json({
        message: 'No tienes permiso para editar este usuario',
    });
}*/
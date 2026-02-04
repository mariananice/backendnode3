export function isAdmin(req, res, next) {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            error: 'Acceso solo para administradores'
        });
    }
    next();
}
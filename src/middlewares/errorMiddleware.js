export default function errorMiddleware(err, req, res, next) {
    console.error(err);

    const status = err.status || 500;
    const message = err.message || "Error interno del servidor";

    res.status(status).json({ message });
}
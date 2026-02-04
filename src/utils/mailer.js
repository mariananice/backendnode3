import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

export async function sendResetCode(to, code) {
    await transporter.sendMail({
        from: '"Soporte" <no-reply@app.com>',
        to,
        subject: 'Código para restablecer contraseña',
        text:
        `Has solicitado restablecer tu contraseña.
        
        Tú código de verificación es:
        
        ${code}
        
        Este código expira en 10 minutos.
        
        Si no solicitaste este cambio, ignora este correo.`
    });
}

/*export async function notifyAdminNewUser(adminEmail, user) {
    await transporter.sendMail({
        from: '"Sistema" <no-replay@app.com>',
        to: adminEmail,
        subject: 'Nuevo usuario pendiente de aprobación',
        text:
        `Se ha registrado un nuevo usuario:
        Nombre: ${user.nombre}
        GMIN: ${user.GMIN}
        Email: ${user.email}
        
        Ingresa al sistema para aprobar o rechazar el acceso.`
    });
}*/
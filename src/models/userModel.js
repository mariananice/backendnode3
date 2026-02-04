export default class User {
    constructor({
        id_usuario,
        nombre_usuario,
        email,
        GMIN,
        password_hash,
        rol,
    }) {
        this.id_usuario = id_usuario;
        this.nombre_usuario = nombre_usuario;
        this.email = email;
        this.GMIN = GMIN;
        this.password_hash = password_hash;
        this.rol = rol;
    }
}
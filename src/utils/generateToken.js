import jwt from 'jsonwebtoken'

export default function generateToken(GMIN) {
    return jwt.sign({ GMIN }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    });
}
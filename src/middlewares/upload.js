import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = 'uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        //cb(null, 'uploads/');
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        //cb(null, Date.now() + "-" + file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos Excel o CSV'));
    }
};

const upload = multer({ storage, fileFilter });

export default upload
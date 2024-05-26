import multer from 'multer';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

export const storage = multer.diskStorage({
    destination: resolve(__dirname, '..', '..', 'contracts'),
    filename: (req, file, callback) => {
        const date = new Date().getTime()
        return callback(null, `${date}_${file.originalname}`)
    }
})

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const makeStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, subfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadTemplate = multer({ storage: makeStorage('templates'), limits: { fileSize: 20 * 1024 * 1024 } });
const uploadDoc     = multer({ storage: makeStorage('documents'), limits: { fileSize: 20 * 1024 * 1024 } });

function saveBase64Image(dataUrl, folder, filename) {
  const baseDir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const buffer = Buffer.from(base64, 'base64');
  const filepath = path.join(baseDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `http://localhost:3000/uploads/${folder}/${filename}`;
}

module.exports = {
    UPLOADS_DIR,
    uploadTemplate,
    uploadDoc,
    saveBase64Image,
    // In-memory upload for Excel imports (no disk write needed)
    uploadExcel: multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
};

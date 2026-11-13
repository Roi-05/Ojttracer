const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = require('../utils/storage');
const { UPLOADS_DIR } = storage;

const makeDiskStorage = (subfolder) => multer.diskStorage({
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

// Supabase Storage in production (when SUPABASE_URL + key are set), local disk otherwise
const makeStorage = (subfolder) => storage.enabled ? storage.supabaseMulterStorage(subfolder) : makeDiskStorage(subfolder);

const uploadTemplate = multer({ storage: makeStorage('templates'), limits: { fileSize: 20 * 1024 * 1024 } });
const uploadDoc     = multer({ storage: makeStorage('documents'), limits: { fileSize: 20 * 1024 * 1024 } });

const imageFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|webp|gif)$/i;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, png, webp, gif).'), false);
};
const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadSignature = multer({
  storage: makeStorage('signatures'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

async function saveBase64Image(dataUrl, folder, filename) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return storage.saveBuffer(folder, filename, Buffer.from(base64, 'base64'));
}

module.exports = {
    UPLOADS_DIR,
    uploadTemplate,
    uploadDoc,
    uploadAvatar,
    uploadSignature,
    saveBase64Image,
    // In-memory upload for Excel imports (no disk write needed)
    uploadExcel: multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
    // In-memory upload for DOCX -> PDF conversion
    uploadConvert: multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }),
};



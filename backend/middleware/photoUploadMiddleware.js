const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDirectory = path.join(__dirname, '..', 'uploads', 'photos');

fs.mkdirSync(uploadsDirectory, { recursive: true });

const mimeExtensionMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = mimeExtensionMap[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomName}${extension}`);
  }
});

function fileFilter(_req, file, cb) {
  const fileExtension = path.extname(file.originalname || '').toLowerCase();
  const isAllowedMime = Object.prototype.hasOwnProperty.call(mimeExtensionMap, file.mimetype);
  const isAllowedExtension = allowedExtensions.has(fileExtension);

  if (!isAllowedMime && !isAllowedExtension) {
    cb(new Error('Formato de arquivo nao suportado. Envie JPG, PNG ou WEBP.'));
    return;
  }

  cb(null, true);
}

const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = {
  uploadPhoto
};

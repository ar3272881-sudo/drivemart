const multer = require('multer');

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    if (!allowed.has(file.mimetype)) return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
    callback(null, true);
  }
});

function carImageUpload(req, res, next) {
  upload.fields([{name:'image',maxCount:1},{name:'gallery',maxCount:4}])(req, res, (error) => {
    req.file = req.files?.image?.[0];
    if (error) {
      req.uploadError = error.code === 'LIMIT_FILE_SIZE'
        ? 'Image size must be 5 MB or less.'
        : 'Only JPG, PNG, WEBP, or AVIF images are allowed.';
    }
    next();
  });
}

module.exports = { carImageUpload };

const multer = require('multer');
const image = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const document = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const fields = [
  { name: 'image', maxCount: 1 }, { name: 'cnic', maxCount: 1 },
  { name: 'registration', maxCount: 1 }, { name: 'numberPlate', maxCount: 1 }
];
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 20 },
  fileFilter(req, file, cb) {
    const allowed = ['image', 'numberPlate'].includes(file.fieldname) ? image : document;
    if (!allowed.has(file.mimetype)) return cb(new Error('Unsupported file type. Upload JPG/PNG/WEBP images or PDF documents.'));
    cb(null, true);
  }
});
function sellerUpload(req, res, next) {
  uploader.fields(fields)(req, res, error => {
    if (error) {
      req.uploadError = error.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 5 MB or smaller.' : 'Upload failed. Please check the file format and size.';
    }
    next();
  });
}
module.exports = { sellerUpload };

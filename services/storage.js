const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

if (hasCloudinary()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function extensionFor(mime) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' })[mime] || 'jpg';
}

async function uploadCarImage(file) {
  if (!file) throw new Error('Please choose a valid car image.');
  if (hasCloudinary()) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'drivemart/cars', resource_type: 'image' },
        (error, uploaded) => error ? reject(error) : resolve(uploaded)
      );
      stream.end(file.buffer);
    });
    return { image: result.secure_url, imagePublicId: result.public_id };
  }

  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${crypto.randomBytes(16).toString('hex')}.${extensionFor(file.mimetype)}`;
  await fs.writeFile(path.join(uploadsDir, filename), file.buffer);
  return { image: filename, imagePublicId: '' };
}

async function deleteCarImage(image, publicId = '') {
  if (publicId && hasCloudinary()) {
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    return;
  }
  const value = String(image || '');
  if (!value || /^https?:\/\//i.test(value)) return;
  const safeName = path.basename(value);
  await fs.unlink(path.join(__dirname, '..', 'public', 'uploads', safeName)).catch(() => undefined);
}

module.exports = { uploadCarImage, deleteCarImage, hasCloudinary };

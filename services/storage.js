const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');

function isReadOnlyHosting() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function extensionFor(mime) {
  return ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif'
  })[mime] || 'jpg';
}

function missingCloudinaryMessage() {
  return 'Image storage is not configured. In Vercel, add CLOUDINARY_URL (recommended) or the three CLOUDINARY_* environment variables, then redeploy.';
}

async function uploadToCloudinary(file) {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'drivemart/cars',
        resource_type: 'image',
        overwrite: false,
        unique_filename: true
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded))
    );

    stream.end(file.buffer);
  });

  return {
    image: result.secure_url,
    imagePublicId: result.public_id
  };
}

async function uploadLocally(file) {
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  const filename = `${crypto.randomBytes(16).toString('hex')}.${extensionFor(file.mimetype)}`;
  await fs.writeFile(path.join(uploadsDir, filename), file.buffer);

  return { image: filename, imagePublicId: '' };
}

async function uploadCarImage(file) {
  if (!file) throw new Error('Please choose a valid car image.');

  if (hasCloudinaryConfig()) {
    try {
      return await uploadToCloudinary(file);
    } catch (error) {
      console.error('Cloudinary upload failed:', error.message);
      throw new Error('Image upload failed. Check the Cloudinary environment variables in Vercel and try again.');
    }
  }

  // Vercel and similar serverless platforms do not allow permanent writes to
  // public/uploads. Fail with a clear setup message instead of an EROFS error.
  if (isReadOnlyHosting() || process.env.NODE_ENV === 'production') {
    throw new Error(missingCloudinaryMessage());
  }

  // Local development can still use public/uploads without Cloudinary.
  return uploadLocally(file);
}

async function deleteCarImage(image, publicId = '') {
  if (publicId && hasCloudinaryConfig()) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch((error) => {
      console.error('Cloudinary delete failed:', error.message);
    });
    return;
  }

  const value = String(image || '');
  if (!value || /^https?:\/\//i.test(value)) return;

  const safeName = path.basename(value);
  await fs.unlink(path.join(__dirname, '..', 'public', 'uploads', safeName)).catch(() => undefined);
}

module.exports = {
  uploadCarImage,
  deleteCarImage,
  hasCloudinary: hasCloudinaryConfig,
  missingCloudinaryMessage
};

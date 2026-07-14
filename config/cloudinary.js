const { v2: cloudinary } = require('cloudinary');

function hasCloudinaryConfig() {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  if (!hasCloudinaryConfig()) return false;

  // The Cloudinary SDK automatically reads CLOUDINARY_URL when it is present.
  // The three separate variables are also supported for easier Vercel setup.
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }

  return true;
}

configureCloudinary();

module.exports = { cloudinary, hasCloudinaryConfig };

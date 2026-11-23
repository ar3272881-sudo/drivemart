const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  legacyId: { type: Number, unique: true, sparse: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 150 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user', 'buyer', 'seller'], default: 'buyer', required: true },
  suspended: { type: Boolean, default: false },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  phone: { type: String, trim: true, maxlength: 20, default: '' },
  avatar: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
  emailVerified: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  legacyId: { type: Number, unique: true, sparse: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 150 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user', required: true }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

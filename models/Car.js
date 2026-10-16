const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  legacyId: { type: Number, unique: true, sparse: true },
  brand: { type: String, required: true, trim: true, maxlength: 100 },
  model: { type: String, required: true, trim: true, maxlength: 100 },
  year: { type: Number, required: true, min: 1900, max: 2100 },
  price: { type: Number, required: true, min: 0 },
  city: { type: String, trim: true, maxlength: 80, default: '' },
  hiddenByAdmin: { type: Boolean, default: false },
  color: { type: String, trim: true, maxlength: 60, default: '' },
  mileage: { type: Number, min: 0, max: 2000000, default: 0 },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'needs_work'], default: 'good' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  // Existing admin-added cars continue to be public; seller listings require approval.
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
  verificationNotes: { type: String, maxlength: 500, default: '' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['available', 'booked', 'sold'], default: 'available', required: true }
}, { timestamps: true });

carSchema.index({ brand: 1, model: 1 });
carSchema.index({ status: 1 });

module.exports = mongoose.models.Car || mongoose.model('Car', carSchema);

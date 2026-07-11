const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  legacyId: { type: Number, unique: true, sparse: true },
  brand: { type: String, required: true, trim: true, maxlength: 100 },
  model: { type: String, required: true, trim: true, maxlength: 100 },
  year: { type: Number, required: true, min: 1900, max: 2100 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['available', 'booked', 'sold'], default: 'available', required: true }
}, { timestamps: true });

carSchema.index({ brand: 1, model: 1 });
carSchema.index({ status: 1 });

module.exports = mongoose.models.Car || mongoose.model('Car', carSchema);

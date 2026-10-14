const mongoose = require('mongoose');
// Private documents stored in MongoDB, never exposed through express.static.
const schema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['cnic', 'registration', 'numberPlate'], required: true },
  filename: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true },
  data: { type: Buffer, required: true, select: false },
  iv: { type: Buffer, required: true, select: false },
  tag: { type: Buffer, required: true, select: false }
}, { timestamps: true });
schema.index({ car: 1, type: 1 }, { unique: true });
module.exports = mongoose.models.ListingDocument || mongoose.model('ListingDocument', schema);

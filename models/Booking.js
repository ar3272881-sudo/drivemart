const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  legacyId: { type: Number, unique: true, sparse: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  preferredDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true }
}, { timestamps: true });

bookingSchema.index(
  { car: 1 },
  { unique: true, partialFilterExpression: { status: 'approved' }, name: 'one_approved_booking_per_car' }
);
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.virtual('displayId').get(function displayId() {
  return this.legacyId ? String(this.legacyId) : this._id.toString().slice(-6).toUpperCase();
});
bookingSchema.set('toObject', { virtuals: true });
bookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

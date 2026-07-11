const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 150 }
}, { timestamps: true });

module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);

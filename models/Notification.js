const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['message','bid','listing','booking','account'], required: true },
  text: { type: String, required: true, trim: true, maxlength: 300 },
  url: { type: String, default: '/notifications', maxlength: 200 },
  readAt: { type: Date, default: null }
}, { timestamps: true });
notificationSchema.index({user:1,readAt:1,createdAt:-1});
module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required:true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required:true },
  count: {type:Number, default: 1}, lastViewedAt: {type:Date, default:Date.now}
}, {timestamps:true});
schema.index({user:1,car:1}, {unique:true});
schema.index({user:1,lastViewedAt:-1});
module.exports = mongoose.models.CarView || mongoose.model('CarView', schema);

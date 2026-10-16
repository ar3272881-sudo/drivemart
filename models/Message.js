const mongoose = require('mongoose');
const schema = new mongoose.Schema({ car: {type: mongoose.Schema.Types.ObjectId, ref:'Car', required:true, index:true}, buyer: {type:mongoose.Schema.Types.ObjectId, ref:'User',required:true,index:true}, seller: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, sender:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, body:{type:String,required:true,maxlength:1500,trim:true} }, {timestamps:true});
schema.index({car:1,buyer:1,createdAt:1});
module.exports = mongoose.models.Message || mongoose.model('Message',schema);

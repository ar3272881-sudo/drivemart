const mongoose = require('mongoose');
const schema = new mongoose.Schema({car:{type:mongoose.Schema.Types.ObjectId,ref:'Car',required:true,index:true},buyer:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},seller:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},amount:{type:Number,required:true,min:1,max:10000000000},status:{type:String,enum:['pending','accepted','rejected'],default:'pending'}},{timestamps:true});
schema.index({car:1,createdAt:-1});
module.exports = mongoose.models.Bid || mongoose.model('Bid',schema);

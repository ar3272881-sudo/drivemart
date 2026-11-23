const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},
 codeHash:{type:String,required:true},expiresAt:{type:Date,required:true},sentAt:{type:Date,required:true},attempts:{type:Number,default:0}
},{timestamps:true});
module.exports=mongoose.models.PasswordResetOtp||mongoose.model('PasswordResetOtp',schema);

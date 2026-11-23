const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',unique:true,required:true,index:true},
 codeHash:{type:String,required:true},
 expiresAt:{type:Date,required:true},
 sentAt:{type:Date,required:true},
 attempts:{type:Number,default:0,min:0}
},{timestamps:true});
module.exports=mongoose.models.EmailVerification || mongoose.model('EmailVerification',schema);

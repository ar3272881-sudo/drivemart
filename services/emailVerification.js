const crypto=require('crypto');
const EmailVerification=require('../models/EmailVerification');
const required=()=>process.env.REQUIRE_EMAIL_VERIFICATION==='true';
const configured=()=>!!(process.env.RESEND_API_KEY && process.env.RESET_FROM_EMAIL && process.env.EMAIL_OTP_SECRET);
function hash(userId, code){return crypto.createHmac('sha256',process.env.EMAIL_OTP_SECRET||'configuration-required').update(`${userId}:${code}`).digest('hex');}
async function sendCode(user){
 if(!required())throw new Error('Email verification has not been enabled by the administrator.');
 if(!configured())throw new Error('Email verification service is not configured. Contact the administrator.');
 const previous=await EmailVerification.findOne({user:user._id});
 if(previous && Date.now()-new Date(previous.sentAt).getTime()<60000)throw new Error('Please wait one minute before requesting another code.');
 const code=String(crypto.randomInt(100000,1000000));
 const response=await fetch('https://api.resend.com/emails',{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.RESEND_API_KEY}`},
 body:JSON.stringify({from:process.env.RESET_FROM_EMAIL,to:[user.email],subject:'DriveMart email verification code',text:`Your DriveMart verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore the email.`})});
 if(!response.ok)throw new Error('Email could not be sent. Check the mail provider configuration.');
 await EmailVerification.findOneAndUpdate({user:user._id},{$set:{codeHash:hash(user._id,code),expiresAt:new Date(Date.now()+10*60*1000),sentAt:new Date(),attempts:0}},{upsert:true,new:true});
 return true;
}
async function verifyCode(user,code){
 if(!/^\d{6}$/.test(code))return false;
 const verification=await EmailVerification.findOne({user:user._id});
 if(!verification || verification.attempts>=5 || verification.expiresAt.getTime()<=Date.now())return false;
 verification.attempts+=1;
 const supplied=Buffer.from(hash(user._id,code),'hex'),expected=Buffer.from(verification.codeHash,'hex');
 const ok=supplied.length===expected.length&&crypto.timingSafeEqual(supplied,expected);
 if(!ok){await verification.save();return false;}
 await require('../models/User').updateOne({_id:user._id},{$set:{emailVerified:true}});
 await EmailVerification.deleteOne({_id:verification._id});return true;
}
module.exports={sendCode,verifyCode,required,configured};

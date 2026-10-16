const express=require('express');const crypto=require('crypto');const bcrypt=require('bcryptjs');const {rateLimit}=require('express-rate-limit');const {verifyCsrf}=require('../middleware/csrf');const User=require('../models/User');const PasswordReset=require('../models/PasswordReset');const router=express.Router();
const limiter=rateLimit({windowMs:15*60*1000,limit:7,standardHeaders:'draft-7',legacyHeaders:false});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
router.get('/forgot-password',(req,res)=>res.render('fr09-forgot',{pageTitle:'Forgot Password'}));
router.post('/forgot-password',limiter,verifyCsrf,async(req,res,next)=>{
 try{
 const email=String(req.body.email||'').trim().toLowerCase();const user=await User.findOne({email,suspended:{$ne:true}});
 if(user){
  if(!process.env.RESEND_API_KEY||!process.env.RESET_FROM_EMAIL||!process.env.PUBLIC_BASE_URL){return res.status(503).render('error',{pageTitle:'Email setup needed',statusCode:503,message:'Password recovery is temporarily unavailable. Please contact administrator.'})}
  const token=crypto.randomBytes(32).toString('hex');const tokenHash=hash(token);
  const link=process.env.PUBLIC_BASE_URL.replace(/\/$/,'')+'/reset-password/'+token;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESET_FROM_EMAIL,to:[user.email],subject:'DriveMart password reset',text:'Your password reset link (valid 30 minutes): '+link})});
  if(!response.ok){console.error('Resend email rejected',response.status);return res.status(503).render('error',{pageTitle:'Email error',statusCode:503,message:'Email delivery unavailable, please try again later.'})}
  await PasswordReset.create({user:user._id,tokenHash,expiresAt:new Date(Date.now()+30*60*1000)});
 }
 res.render('fr09-sent',{pageTitle:'Reset Requested'});
 }catch(e){next(e)}
});
router.get('/reset-password/:token',async(req,res)=>{const token=String(req.params.token||'');if(!/^[0-9a-f]{64}$/.test(token))return res.status(400).send('Invalid link');const reset=await PasswordReset.findOne({tokenHash:hash(token),usedAt:null,expiresAt:{$gt:new Date()}}).lean();if(!reset)return res.status(400).send('Link expired or already used');res.render('fr09-reset',{pageTitle:'Reset Password',token,error:''})});
router.post('/reset-password/:token',limiter,verifyCsrf,async(req,res)=>{
 const token=String(req.params.token||''),password=String(req.body.password||'');if(!/^[0-9a-f]{64}$/.test(token))return res.status(400).send('Invalid link');
 if(password.length<8||password.length>128)return res.status(422).render('fr09-reset',{pageTitle:'Reset Password',token,error:'Password must be 8-128 characters'});
 const reset=await PasswordReset.findOneAndUpdate({tokenHash:hash(token),usedAt:null,expiresAt:{$gt:new Date()}},{$set:{usedAt:new Date()}},{new:true});if(!reset)return res.status(400).send('Link expired or already used');
 await User.updateOne({_id:reset.user},{$set:{passwordHash:await bcrypt.hash(password,12)}});await PasswordReset.deleteMany({user:reset.user});req.flash('success','Password changed. Please login.');res.redirect('/login');
});module.exports=router;

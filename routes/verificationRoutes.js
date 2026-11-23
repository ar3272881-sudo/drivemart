const express=require('express');
const {rateLimit}=require('express-rate-limit');
const User=require('../models/User');
const {verifyCsrf}=require('../middleware/csrf');
const {requireLogin}=require('../middleware/auth');
const {sendCode,verifyCode,required,configured}=require('../services/emailVerification');
const router=express.Router(),limiter=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false});
router.use('/verify-email',requireLogin);
router.get('/verify-email',async(req,res)=>{
 const user=await User.findById(req.session.user.id).select('email emailVerified').lean();
 res.render('verify-email',{pageTitle:'Verify Email - Drive Mart',user,required:required(),configured:configured()});
});
router.post('/verify-email/send',limiter,verifyCsrf,async(req,res)=>{
 const user=await User.findById(req.session.user.id).select('email emailVerified');
 if(!user||user.emailVerified){req.flash('success','Email already verified.');return res.redirect('/profile');}
 try{await sendCode(user);req.flash('success','A six-digit verification code was sent to your email.');}catch(error){req.flash('error',error.message);}
 res.redirect('/verify-email');
});
router.post('/verify-email/confirm',limiter,verifyCsrf,async(req,res)=>{
 const user=await User.findById(req.session.user.id);
 if(!user)return res.redirect('/login');
 const ok=await verifyCode(user,String(req.body.code||'').trim());
 req.flash(ok?'success':'error',ok?'Email verified successfully.':'Invalid/expired code. Request a new code if needed.');
 res.redirect(ok?'/dashboard':'/verify-email');
});
module.exports=router;

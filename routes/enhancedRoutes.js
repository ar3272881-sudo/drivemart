const express=require('express');
const multer=require('multer');
const bcrypt=require('bcryptjs');
const User=require('../models/User');
const Car=require('../models/Car');
const CarView=require('../models/CarView');
const Notification=require('../models/Notification');
const { requireLogin }=require('../middleware/auth');
const { verifyCsrf }=require('../middleware/csrf');
const { isObjectId }=require('../utils/helpers');
const { uploadCarImage,deleteCarImage }=require('../services/storage');
const { subscribe }=require('../services/notifications');
const { recommendations,publicFilter }=require('../services/recommendations');
const router=express.Router();
for(const prefix of ['/profile','/favorites','/recommendations','/notifications','/events','/cars/:id/favorite']) router.use(prefix,requireLogin);
const avatarUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1},fileFilter(req,file,cb){cb(null,['image/png','image/jpeg','image/webp'].includes(file.mimetype));}}).single('avatar');
router.get('/profile',async(req,res)=>{
 const user=await User.findById(req.session.user.id).select('name email role city phone avatar emailVerified').lean();
 res.render('profile',{pageTitle:'My Profile - Drive Mart',user,error:''});
});
router.post('/profile',(req,res,next)=>avatarUpload(req,res,error=>{
 if(error){req.flash('error','Profile image must be JPG/PNG/WEBP and at most 2MB.');return res.redirect('/profile');}next();
}),verifyCsrf,async(req,res)=>{
 const name=String(req.body.name||'').trim();const city=String(req.body.city||'').trim();const phone=String(req.body.phone||'').trim();
 const user=await User.findById(req.session.user.id);
 let error='';if(name.length<2||name.length>100)error='Enter your name (2-100 characters).';
 if(city.length>80)error='City is too long.';
 if(phone&&!/^[+\d\s()-]{7,20}$/.test(phone))error='Enter a valid phone number.';
 if(error)return res.status(422).render('profile',{pageTitle:'My Profile',user:{...user.toObject(),name,city,phone},error});
 let uploaded;
 try {
  if(req.file)uploaded=await uploadCarImage(req.file);
  const old={image:user.avatar,id:user.avatarPublicId};
  Object.assign(user,{name,city,phone});
  if(uploaded){user.avatar=uploaded.image;user.avatarPublicId=uploaded.imagePublicId;}
  await user.save();if(uploaded)await deleteCarImage(old.image,old.id);
  req.session.user.name=name;req.flash('success','Profile updated.');return res.redirect('/profile');
 }catch(e){if(uploaded)await deleteCarImage(uploaded.image,uploaded.imagePublicId);throw e;}
});
router.post('/profile/password',verifyCsrf,async(req,res)=>{
 const user=await User.findById(req.session.user.id).select('+passwordHash');
 const old=String(req.body.currentPassword||''),next=String(req.body.newPassword||'');
 if(next.length<8||next.length>128||!(await bcrypt.compare(old,user.passwordHash))){req.flash('error','Password could not be updated. Check old password and new password length (8-128).');return res.redirect('/profile')}
 user.passwordHash=await bcrypt.hash(next,12);await user.save();req.flash('success','Password changed.');res.redirect('/profile');
});
router.get('/favorites',async(req,res)=>{
 const user=await User.findById(req.session.user.id).populate({path:'favorites',match:publicFilter}).lean();
 res.render('favorites',{pageTitle:'Saved Cars - Drive Mart',cars:user?.favorites||[]});
});
router.post('/cars/:id/favorite',verifyCsrf,async(req,res)=>{
 if(!isObjectId(req.params.id))return res.status(400).send('Invalid car');
 const car=await Car.exists({_id:req.params.id,...publicFilter});if(!car)return res.status(404).send('Car not found');
 const user=await User.findById(req.session.user.id).select('favorites');
 const saved=user.favorites.some(id=>String(id)===req.params.id);
 await User.updateOne({_id:user._id},saved?{$pull:{favorites:car._id}}:{$addToSet:{favorites:car._id}});
 req.flash('success',saved?'Removed from favorites.':'Car saved to favorites.');
 let destination='/favorites';
 try { const back=new URL(String(req.get('referer')||'')); if(back.origin===`${req.protocol}://${req.get('host')}` && back.pathname.startsWith('/') && !back.pathname.startsWith('//')) destination=back.pathname+back.search; }catch(_){}
 res.redirect(destination);
});
router.get('/recommendations',async(req,res)=>{
 const cars=await recommendations(req.session.user.id,16);
 res.render('recommendations',{pageTitle:'Cars For You - Drive Mart',cars});
});
router.get('/notifications',async(req,res)=>{
 const notifications=await Notification.find({user:req.session.user.id}).sort({createdAt:-1}).limit(100).lean();
 res.render('notifications',{pageTitle:'Notifications - Drive Mart',notifications});
});
router.get('/notifications/count',async(req,res)=>{
 res.set('Cache-Control','no-store');res.json({count:await Notification.countDocuments({user:req.session.user.id,readAt:null})});
});
router.post('/notifications/:id/read',verifyCsrf,async(req,res)=>{
 if(!isObjectId(req.params.id))return res.status(400).send('Invalid notification');
 const notification=await Notification.findOneAndUpdate({_id:req.params.id,user:req.session.user.id},{$set:{readAt:new Date()}},{new:true});
 res.redirect(notification?.url?.startsWith('/')&&!notification.url.startsWith('//')?notification.url:'/notifications');
});
router.post('/notifications/read-all',verifyCsrf,async(req,res)=>{
 await Notification.updateMany({user:req.session.user.id,readAt:null},{$set:{readAt:new Date()}});res.redirect('/notifications');
});
router.get('/events',(req,res)=>{
 if(process.env.VERCEL==='1'||process.env.DISABLE_SSE==='true')return res.status(503).json({error:'Use periodic updates in serverless deployment.'});
 res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
 res.flushHeaders?.();const unsubscribe=subscribe(req.session.user.id,res);res.on('close',unsubscribe);
});
module.exports=router;

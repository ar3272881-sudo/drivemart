const express = require('express');
const Car = require('../models/Car');
const Message = require('../models/Message');
const {requireLogin}=require('../middleware/auth');
const {verifyCsrf}=require('../middleware/csrf');
const {isObjectId}=require('../utils/helpers');
const router=express.Router();
router.use('/chat',requireLogin);
async function conversation(req,res,next){
 try {
  if(!isObjectId(req.params.carId)) return res.status(400).send('Invalid car');
  const car=await Car.findById(req.params.carId).lean();
  if(!car||!car.seller||car.hiddenByAdmin||car.approvalStatus!=='approved') return res.status(404).send('Chat unavailable');
  const me=String(req.session.user.id);
  const isSeller=String(car.seller)===me;
  const buyer=isSeller?String(req.query.buyer||req.body.buyer||''):me;
  if(isSeller && !isObjectId(buyer)) return res.status(400).send('Select a buyer from conversations');
  if(!isSeller && req.session.user.role==='admin') return res.status(403).send('Use a buyer account');
  if(!isSeller && String(car.seller)===buyer) return res.status(400).send('Cannot chat yourself');
  req.chat={car,buyer,seller:String(car.seller)};next();
 }catch(err){next(err)}
}
router.get('/chat/inbox', async(req,res)=>{
 const me=req.session.user.id;
 const rows=await Message.aggregate([{$match:{$or:[{buyer:require('mongoose').Types.ObjectId.createFromHexString(me)},{seller:require('mongoose').Types.ObjectId.createFromHexString(me)}]}},{$sort:{createdAt:-1}},{$group:{_id:{car:'$car',buyer:'$buyer'},last:{$first:'$body'},when:{$first:'$createdAt'}}},{$sort:{when:-1}},{$limit:100}]);
 const populated=await Promise.all(rows.map(async r=>{const car=await Car.findById(r._id.car).select('brand model seller').lean();const buyer=await require('../models/User').findById(r._id.buyer).select('name').lean();return {car,buyer,last:r.last}}));
 res.render('fr06-inbox',{pageTitle:'My Chats',rows:populated.filter(r=>r.car)});
});
router.get('/chat/:carId',conversation,async(req,res)=>res.render('fr06-chat',{pageTitle:'Car Chat',...req.chat,me:String(req.session.user.id),csrfToken:res.locals.csrfToken}));
router.get('/chat/:carId/messages',conversation,async(req,res)=>{
 const {car,buyer}=req.chat;
 const rows=await Message.find({car:car._id,buyer}).sort({createdAt:-1}).limit(100).lean();
 res.set('Cache-Control','no-store');res.json({messages:rows.reverse().map(m=>({sender:String(m.sender),body:m.body,createdAt:m.createdAt}))});
});
router.post('/chat/:carId/messages',verifyCsrf,conversation,async(req,res)=>{
 const body=String(req.body.body||'').trim();if(!body||body.length>1500)return res.status(422).json({error:'Message must contain 1-1500 characters'});
 const {car,buyer,seller}=req.chat;await Message.create({car:car._id,buyer,seller,sender:req.session.user.id,body});
 res.status(201).json({ok:true});
});
module.exports=router;

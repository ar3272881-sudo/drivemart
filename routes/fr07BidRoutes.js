const express=require('express');const Car=require('../models/Car');const Bid=require('../models/Bid');const {requireLogin,requireSeller}=require('../middleware/auth');const {verifyCsrf}=require('../middleware/csrf');const {isObjectId}=require('../utils/helpers');const router=express.Router();
router.post('/cars/:carId/bids',requireLogin,verifyCsrf,async(req,res)=>{
 const id=req.params.carId,amount=Number(req.body.amount);
 if(!isObjectId(id)||!Number.isSafeInteger(amount)||amount<=0||amount>10000000000){req.flash('error','Enter a valid bid amount');return res.redirect('/inventory')}
 const car=await Car.findById(id);
 if(!car||!car.seller||car.hiddenByAdmin||car.approvalStatus!=='approved'||car.status!=='available'||String(car.seller)===String(req.session.user.id)){req.flash('error','Bidding unavailable for this car');return res.redirect('/inventory')}
 await Bid.create({car:car._id,buyer:req.session.user.id,seller:car.seller,amount});req.flash('success','Bid sent to seller');res.redirect('/cars/'+id);
});
router.get('/my-bids',requireLogin,async(req,res)=>{const bids=await Bid.find({buyer:req.session.user.id}).populate('car','brand model').sort({createdAt:-1}).lean();res.render('fr07-bids',{pageTitle:'My Bids',bids,sellerView:false})});
router.get('/seller/bids',requireSeller,async(req,res)=>{const bids=await Bid.find({seller:req.session.user.id}).populate('car','brand model').populate('buyer','name email').sort({createdAt:-1}).lean();res.render('fr07-bids',{pageTitle:'Received Bids',bids,sellerView:true})});
router.post('/seller/bids/:id/decision',requireSeller,verifyCsrf,async(req,res)=>{if(!isObjectId(req.params.id))return res.redirect('/seller/bids');const status=String(req.body.status);if(!['accepted','rejected'].includes(status))return res.status(422).send('Invalid decision');const bid=await Bid.findOne({_id:req.params.id,seller:req.session.user.id,status:'pending'});if(!bid){req.flash('error','Bid cannot be updated');return res.redirect('/seller/bids')}const car=await Car.findOne({_id:bid.car,seller:req.session.user.id,status:'available',approvalStatus:'approved',hiddenByAdmin:{$ne:true}});if(!car){req.flash('error','Car is unavailable');return res.redirect('/seller/bids')}bid.status=status;await bid.save();req.flash('success','Bid '+status+'. Agree on payment and handover separately.');res.redirect('/seller/bids')});
module.exports=router;

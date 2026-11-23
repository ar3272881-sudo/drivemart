const express = require('express');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Subscriber = require('../models/Subscriber');
const { requireLogin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { escapeRegex, isObjectId } = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  const featured = await Car.find({ status: 'available', hiddenByAdmin: { $ne: true }, $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] }).sort({ createdAt: -1 }).limit(6).lean();
  res.render('index', { pageTitle: 'Drive Mart | Premium Car Marketplace', hideSimpleFooter: true, featured });
});

router.get('/inventory', async (req,res)=>{
 const search=String(req.query.search||'').trim().slice(0,100),city=String(req.query.city||'').trim().slice(0,80);
 const status=String(req.query.status||''),brand=String(req.query.brand||'').trim().slice(0,100);
 const minPrice=String(req.query.minPrice||''),maxPrice=String(req.query.maxPrice||'');
 const minYear=String(req.query.minYear||''),maxYear=String(req.query.maxYear||'');
 const maxMileage=String(req.query.maxMileage||'');
 const fuelType=String(req.query.fuelType||''),transmission=String(req.query.transmission||''),bodyType=String(req.query.bodyType||'');
 const sort=String(req.query.sort||'newest');const page=Math.max(1,Math.min(500,parseInt(req.query.page,10)||1));const limit=12;
 const query={hiddenByAdmin:{$ne:true},$and:[{$or:[{approvalStatus:'approved'},{approvalStatus:{$exists:false}}]}]};
 if(search){const match=new RegExp(escapeRegex(search),'i');query.$or=[{brand:match},{model:match},{description:match}];}
 if(city)query.city=new RegExp(escapeRegex(city),'i');
 if(brand)query.brand=new RegExp(`^${escapeRegex(brand)}$`,'i');
 const price={};if(minPrice!==''&&Number.isFinite(+minPrice)&&+minPrice>=0)price.$gte=+minPrice;
 if(maxPrice!==''&&Number.isFinite(+maxPrice)&&+maxPrice>=0)price.$lte=+maxPrice;
 if(Object.keys(price).length)query.price=price;
 const year={};if(minYear!==''&&Number.isInteger(+minYear)&&+minYear>=1900)year.$gte=+minYear;
 if(maxYear!==''&&Number.isInteger(+maxYear)&&+maxYear<=new Date().getFullYear()+1)year.$lte=+maxYear;
 if(Object.keys(year).length)query.year=year;
 if(maxMileage!==''&&Number.isFinite(+maxMileage)&&+maxMileage>=0)query.mileage={$lte:+maxMileage};
 if(['available','booked','sold'].includes(status))query.status=status;
 if(['petrol','diesel','hybrid','electric','cng','lpg'].includes(fuelType))query.fuelType=fuelType;
 if(['manual','automatic'].includes(transmission))query.transmission=transmission;
 if(['sedan','hatchback','suv','pickup','van','coupe','other'].includes(bodyType))query.bodyType=bodyType;
 const lat=Number(req.query.lat),lng=Number(req.query.lng),distance=Number(req.query.distance);
 const near= req.query.lat!==undefined && req.query.lng!==undefined && Number.isFinite(lat)&&Math.abs(lat)<=90 && Number.isFinite(lng)&&Math.abs(lng)<=180 && Number.isFinite(distance)&&distance>0&&distance<=500;
 if(near)query.location={$near:{$geometry:{type:'Point',coordinates:[lng,lat]},$maxDistance:distance*1000}};
 const sortModes={newest:{createdAt:-1},oldest:{createdAt:1},price_asc:{price:1},price_desc:{price:-1},year_desc:{year:-1},popular:{views:-1}};
 const order=near?undefined:(sortModes[sort]||sortModes.newest);
 const countQuery=near?{...query,location:{$geoWithin:{$centerSphere:[[lng,lat],distance/6378.1]}}}:query;
 const count=await Car.countDocuments(countQuery);
 const cars=await (order?Car.find(query).sort(order):Car.find(query)).skip((page-1)*limit).limit(limit).lean();
 const brands=await Car.distinct('brand',{approvalStatus:'approved',hiddenByAdmin:{$ne:true}});
 res.render('inventory',{pageTitle:'Inventory - Drive Mart',cars,search,status,city,brand,minPrice,maxPrice,minYear,maxYear,maxMileage,fuelType,transmission,bodyType,sort,page,totalPages:Math.ceil(count/limit),count,brands:brands.sort(),near,lat:near?lat:'',lng:near?lng:'',distance:near?distance:'' ,allowedStatuses:['available','booked','sold'],queryParams:{...req.query}});
});

router.get('/cars/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) { req.flash('error', 'Invalid car selected.'); return res.redirect('/inventory'); }
  const car = await Car.findById(req.params.id).lean();
  if (!car || (car.hiddenByAdmin && req.session.user?.role !== 'admin') || (car.approvalStatus && car.approvalStatus !== 'approved' && req.session.user?.role !== 'admin' && String(car.seller) !== req.session.user?.id)) { req.flash('error', 'Car not found.'); return res.redirect('/inventory'); }
  await Car.updateOne({_id:car._id},{$inc:{views:1}});
  if(req.session.user?.id){
    const CarView=require('../models/CarView');
    await CarView.updateOne({user:req.session.user.id,car:car._id},{$inc:{count:1},$set:{lastViewedAt:new Date()}},{upsert:true});
  }
  const User=require('../models/User');
  const owner=req.session.user?.id ? await User.findById(req.session.user.id).select('favorites').lean() : null;
  const isFavorite=!!owner?.favorites?.some(id=>String(id)===String(car._id));
  return res.render('car-details', {pageTitle:`${car.brand} ${car.model} - Drive Mart`,car,isFavorite});
});

router.get('/dashboard', requireLogin, async (req, res) => {
  const activeBookings = await Booking.countDocuments({ user: req.session.user.id, status: { $in: ['pending', 'approved'] } });
  const { recommendations }=require('../services/recommendations');
  const recommended=await recommendations(req.session.user.id,4);
  res.render('dashboard',{pageTitle:'Dashboard - Drive Mart',activeBookings,recommended});
});

router.post('/subscribe', verifyCsrf, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    req.flash('error', 'Please enter a valid subscription email.');
    return res.redirect('/#newsletter');
  }
  try {
    await Subscriber.create({ email });
    req.flash('success', 'Thanks! You are now subscribed.');
  } catch (error) {
    if (error?.code === 11000) req.flash('success', 'This email is already subscribed.');
    else throw error;
  }
  return res.redirect('/#newsletter');
});

module.exports = router;

const express = require('express');
const Car = require('../models/Car');
const ListingDocument = require('../models/ListingDocument');
const { requireSeller } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { sellerUpload } = require('../middleware/sellerUpload');
const { uploadCarImage, uploadGalleryImages, deleteCarImage } = require('../services/storage');
const { isObjectId } = require('../utils/helpers');
const { encryptDocument } = require('../services/documentCrypto');
const router = express.Router();
router.use(requireSeller);
router.use(require('../middleware/verifiedEmail').requireVerifiedEmail);
const emptyCar = () => ({ city: '', brand: '', model: '', year: '', color: '', mileage: 0, condition: 'good', price: '', description: '', fuelType:'',transmission:'',bodyType:'',engineCC:0,gallery:[],location:null });
const { notify }=require('../services/notifications');
const User=require('../models/User');
const Booking=require('../models/Booking');
const firstFile = (req, name) => req.files?.[name]?.[0];
function fieldsFrom(body) {
  return {
    city: String(body.city || '').trim().slice(0,80), brand: String(body.brand || '').trim(), model: String(body.model || '').trim(),
    year: Number(body.year), color: String(body.color || '').trim(),
    mileage: Number(body.mileage), condition: String(body.condition || 'good'),
    price: Number(body.price), description: String(body.description || '').trim(),
    fuelType:String(body.fuelType||''),transmission:String(body.transmission||''),bodyType:String(body.bodyType||''),engineCC:Number(body.engineCC||0),
    location:body.latitude!==''&&body.longitude!==''&&Number.isFinite(Number(body.latitude))&&Number.isFinite(Number(body.longitude))&&Number(body.latitude)>=-90&&Number(body.latitude)<=90&&Number(body.longitude)>=-180&&Number(body.longitude)<=180?{type:'Point',coordinates:[Number(body.longitude),Number(body.latitude)]}:undefined
  };
}
function validate(req, v, fresh) {
  if (req.uploadError) return req.uploadError;
  if (!v.brand || v.brand.length > 100 || !v.model || v.model.length > 100) return 'Brand and model are required (up to 100 characters).';
  if (!Number.isInteger(v.year) || v.year < 1900 || v.year > new Date().getFullYear() + 1) return 'Enter a valid year.';
  if (v.color.length > 60) return 'Color is too long.';
  if (!Number.isFinite(v.mileage) || v.mileage < 0 || v.mileage > 2000000) return 'Enter valid mileage.';
  if (!['excellent','good','fair','needs_work'].includes(v.condition)) return 'Invalid condition.';
  if (!Number.isFinite(v.price) || v.price <= 0) return 'Enter a positive selling price.';
  if (!['','petrol','diesel','hybrid','electric','cng','lpg'].includes(v.fuelType)) return 'Invalid fuel type.';
  if (!['','manual','automatic'].includes(v.transmission)) return 'Invalid transmission.';
  if (!['','sedan','hatchback','suv','pickup','van','coupe','other'].includes(v.bodyType)) return 'Invalid body type.';
  if(!Number.isFinite(v.engineCC)||v.engineCC<0||v.engineCC>20000) return 'Invalid engine capacity.';
  if ((req.body.latitude&&!req.body.longitude)||(req.body.longitude&&!req.body.latitude)) return 'Provide both latitude and longitude.';
  if(req.body.latitude&&req.body.longitude&&!v.location) return 'Invalid coordinates.';
  if (v.description.length > 2000) return 'Description must be under 2000 characters.';
  if (fresh && !firstFile(req, 'image')) return 'Upload a car photo.';
  if (fresh && !['cnic','registration','numberPlate'].every(name => firstFile(req,name))) return 'CNIC, registration document and number plate photo are required.';
  return '';
}
async function saveDocuments(req, carId) {
  for (const type of ['cnic','registration','numberPlate']) {
    const file = firstFile(req, type);
    if (!file) continue;
    await ListingDocument.findOneAndUpdate(
      { car: carId, type },
      { $set: { uploader: req.session.user.id, filename: file.originalname.slice(0,255), mimeType: file.mimetype, ...encryptDocument(file.buffer) } },
      { upsert: true, new: true, runValidators: true }
    );
  }
}
router.get('/', async (req, res) => {
  const cars = await Car.find({ seller: req.session.user.id }).sort({ createdAt: -1 }).lean();
  const Bid=require('../models/Bid'),Message=require('../models/Message');
  const counts=await Promise.all(cars.map(async car=>({
    bids:await Bid.countDocuments({car:car._id}),messages:await Message.countDocuments({car:car._id}),
    saves:await User.countDocuments({favorites:car._id})
  })));
  cars.forEach((car,i)=>Object.assign(car,{analytics:counts[i]}));
  res.render('seller-dashboard', { pageTitle: 'Seller Dashboard - Drive Mart', cars });
});
router.get('/cars/new', (req, res) => res.render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error: '', car: emptyCar() }));
router.post('/cars', sellerUpload, verifyCsrf, async (req, res) => {
  const values = fieldsFrom(req.body);
  const error = validate(req, values, true);
  if (error) return res.status(422).render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error, car: values });
  let uploaded;
  let gallery=[];
  let car;
  try {
    uploaded = await uploadCarImage(firstFile(req, 'image'));
    gallery = await uploadGalleryImages(req.files?.gallery||[]);
    car = await Car.create({ ...values, ...uploaded, gallery, seller: req.session.user.id, approvalStatus: 'pending', status: 'available' });
    await saveDocuments(req, car._id);
    const admins=await User.find({role:'admin'}).select('_id').lean();
    await Promise.allSettled(admins.map(admin=>notify(admin._id,'listing',`New listing awaits review: ${car.brand} ${car.model}`,`/admin/verifications/${car._id}`)));
    req.flash('success', 'Listing submitted as Pending. Admin will review your verification documents.');
    return res.redirect('/seller');
  } catch {
    if (car) { await ListingDocument.deleteMany({ car: car._id }).catch(() => {}); await Car.deleteOne({ _id: car._id }).catch(() => {}); }
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    await Promise.all(gallery.map(i=>deleteCarImage(i.url,i.publicId)));
    return res.status(500).render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error: 'Could not save listing. Please try again.', car: values });
  }
});
async function editableOwnedCar(req) {
  if (!isObjectId(req.params.id)) return null;
  return Car.findOne({ _id: req.params.id, seller: req.session.user.id, status:{$ne:'sold'} });
}
router.get('/cars/:id/edit', async (req, res) => {
  const car = await editableOwnedCar(req);
  if (!car) { req.flash('error', 'This listing is unavailable for editing.'); return res.redirect('/seller'); }
  return res.render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error: '', car: car.toObject() });
});
router.post('/cars/:id/resubmit', sellerUpload, verifyCsrf, async (req, res) => {
  const car = await editableOwnedCar(req);
  if (!car) { req.flash('error', 'This listing cannot be edited.'); return res.redirect('/seller'); }
  const values = fieldsFrom(req.body);
  const error = validate(req, values, false);
  if (error) return res.status(422).render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error, car: { ...car.toObject(), ...values } });
  let uploaded;
  let gallery=[];
  try {
    if (await Booking.exists({car:car._id,status:'approved'}))throw new Error('Approved booking exists. Contact admin before editing.');
    if (firstFile(req,'image')) uploaded = await uploadCarImage(firstFile(req,'image'));
    gallery = await uploadGalleryImages(req.files?.gallery||[]);
    await saveDocuments(req, car._id);
    const docTypes = await ListingDocument.distinct('type', { car: car._id });
    if (!['cnic','registration','numberPlate'].every(t => docTypes.includes(t))) throw new Error('Missing verification documents.');
    const previous = { image: car.image, imagePublicId: car.imagePublicId };
    const remove=Array.isArray(req.body.removeGallery)?req.body.removeGallery:[req.body.removeGallery].filter(Boolean);
    const removed=(car.gallery||[]).filter(image=>remove.includes(image.url));
    const kept=(car.gallery||[]).filter(image=>!remove.includes(image.url));
    if(kept.length+gallery.length>4)throw new Error('Maximum 5 photos total including the cover photo.');
    Object.assign(car, values, uploaded || {});
    car.gallery=[...kept,...gallery];
    car.approvalStatus = 'pending'; car.verificationNotes = ''; car.verifiedBy = null; car.verifiedAt = null;
    await car.save();
    if (uploaded) await deleteCarImage(previous.image, previous.imagePublicId);
    await Promise.allSettled(removed.map(i=>deleteCarImage(i.url,i.publicId)));
    const admins=await User.find({role:'admin'}).select('_id').lean();
    await Promise.allSettled(admins.map(admin=>notify(admin._id,'listing',`Listing resubmitted for review: ${car.brand} ${car.model}`,`/admin/verifications/${car._id}`)));
    req.flash('success', 'Edited listing resubmitted for admin review.');
    return res.redirect('/seller');
  } catch (e) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    await Promise.allSettled(gallery.map(i=>deleteCarImage(i.url,i.publicId)));
    return res.status(422).render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error: e.message || 'Update failed.', car: { ...car.toObject(), ...values } });
  }
});
// Marking sold is forbidden while a confirmed booking exists.
router.post('/cars/:id/sold', verifyCsrf, async(req,res)=>{
 const car=await Car.findOne({_id:isObjectId(req.params.id)?req.params.id:null,seller:req.session.user.id,approvalStatus:'approved',status:'available'});
 if(!car){req.flash('error','This car cannot be marked sold.');return res.redirect('/seller');}
 if(await Booking.exists({car:car._id,status:'approved'})){req.flash('error','An approved booking exists. Ask admin to resolve it first.');return res.redirect('/seller');}
 car.status='sold';await car.save();req.flash('success','Car marked sold.');res.redirect('/seller');
});
router.post('/cars/:id/delete',verifyCsrf,async(req,res)=>{
 const car=await Car.findOne({_id:isObjectId(req.params.id)?req.params.id:null,seller:req.session.user.id});
 if(!car){req.flash('error','You can delete only your own car.');return res.redirect('/seller');}
 if(await Booking.exists({car:car._id,status:'approved'})){req.flash('error','Cannot delete a car with an approved booking.');return res.redirect('/seller');}
 await Promise.all([
  require('../models/Bid').deleteMany({car:car._id}),require('../models/Message').deleteMany({car:car._id}),
  require('../models/CarView').deleteMany({car:car._id}),Booking.deleteMany({car:car._id}),
  ListingDocument.deleteMany({car:car._id}),User.updateMany({},{$pull:{favorites:car._id}})
 ]);
 await car.deleteOne();
 await Promise.allSettled([{url:car.image,publicId:car.imagePublicId},...(car.gallery||[])].map(i=>deleteCarImage(i.url,i.publicId)));
 req.flash('success','Listing removed.');res.redirect('/seller');
});
module.exports = router;

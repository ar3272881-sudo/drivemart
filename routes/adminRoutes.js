const express = require('express');
const Car = require('../models/Car');
const User = require('../models/User');
const Booking = require('../models/Booking');
const ListingDocument = require('../models/ListingDocument');
const { decryptDocument } = require('../services/documentCrypto');
const { requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { carImageUpload } = require('../middleware/upload');
const { uploadCarImage, uploadGalleryImages, deleteCarImage } = require('../services/storage');
const { isObjectId } = require('../utils/helpers');

const {notify}=require('../services/notifications');
const router = express.Router();
router.use(requireAdmin);

function validateCar(body, imageRequired, file, uploadError) {
  const values = {
    city: String(body.city || '').trim().slice(0,80), brand: String(body.brand || '').trim(), model: String(body.model || '').trim(),
    year: Number(body.year), price: Number(body.price), description: String(body.description || '').trim(),
    status: String(body.status || 'available'),
    mileage: Number(body.mileage||0),condition: String(body.condition||'good'),color: String(body.color||'').trim().slice(0,60),
    fuelType:String(body.fuelType||''),transmission:String(body.transmission||''),bodyType:String(body.bodyType||''),engineCC:Number(body.engineCC||0),
    location: body.latitude!==''&&body.longitude!==''&&Number.isFinite(Number(body.latitude))&&Number.isFinite(Number(body.longitude))&&Number(body.latitude)>=-90&&Number(body.latitude)<=90&&Number(body.longitude)>=-180&&Number(body.longitude)<=180?{type:'Point',coordinates:[Number(body.longitude),Number(body.latitude)]}:undefined
  };
  const maxYear = new Date().getFullYear() + 1;
  let error = uploadError || '';
  if (!error && (!values.brand || !values.model)) error = 'Brand and model are required.';
  else if (!error && (!Number.isInteger(values.year) || values.year < 1900 || values.year > maxYear)) error = 'Enter a valid model year.';
  else if (!error && (!Number.isFinite(values.price) || values.price < 0)) error = 'Enter a valid price.';
  else if (!error && !['available', 'booked', 'sold'].includes(values.status)) error = 'Invalid car status.';
  else if (!error && (!Number.isFinite(values.mileage)||values.mileage<0||values.mileage>2000000)) error='Invalid mileage.';
  else if (!error && !['excellent','good','fair','needs_work'].includes(values.condition)) error='Invalid condition.';
  else if (!error && !['','petrol','diesel','hybrid','electric','cng','lpg'].includes(values.fuelType)) error='Invalid fuel.';
  else if (!error && !['','manual','automatic'].includes(values.transmission)) error='Invalid transmission.';
  else if (!error && !['','sedan','hatchback','suv','pickup','van','coupe','other'].includes(values.bodyType)) error='Invalid body type.';
  else if (!error && (!Number.isFinite(values.engineCC)||values.engineCC<0||values.engineCC>20000)) error='Invalid engine CC.';
  else if (!error && ((body.latitude&&!body.longitude)||(body.longitude&&!body.latitude)||(body.latitude&&body.longitude&&!values.location)))error='Provide valid latitude and longitude.';
  else if (!error && imageRequired && !file) error = 'Please choose a valid car image.';
  return { values, error };
}

router.get('/', async (req, res) => {
  const [users, cars, bookings, pending, recent] = await Promise.all([
    User.countDocuments(), Car.countDocuments(), Booking.countDocuments(), Booking.countDocuments({ status: 'pending' }),
    Booking.find().populate('user', 'name').populate('car', 'brand model').sort({ createdAt: -1 }).limit(6).lean({ virtuals: true })
  ]);
  const pendingListings = await Car.countDocuments({ approvalStatus: 'pending' });
  res.render('admin-dashboard', { pageTitle: 'Admin Dashboard - Drive Mart', stats: { users, cars, bookings, pending, pendingListings }, recent });
});

// FR05: Administrator reviews seller-provided documents before a car becomes public.
router.get('/verifications', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const cars = await Car.find({ seller: { $ne: null }, approvalStatus: status }).populate('seller', 'name email').sort({ createdAt: -1 }).lean();
  return res.render('admin-verifications', { pageTitle: 'Listing Verifications - Drive Mart', cars, status });
});
router.get('/verifications/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/admin/verifications');
  const car = await Car.findOne({ _id: req.params.id, seller: { $ne: null } }).populate('seller', 'name email').lean();
  if (!car) return res.redirect('/admin/verifications');
  const documents = await ListingDocument.find({ car: car._id }).select('type filename mimeType').lean();
  return res.render('admin-verification-detail', { pageTitle: 'Verify Car - Drive Mart', car, documents });
});
router.get('/verifications/:id/documents/:type', async (req, res) => {
  if (!isObjectId(req.params.id) || !['cnic', 'registration', 'numberPlate'].includes(req.params.type)) return res.sendStatus(404);
  const doc = await ListingDocument.findOne({ car: req.params.id, type: req.params.type }).select('+data +iv +tag');
  if (!doc) return res.sendStatus(404);
  res.set({ 'Content-Type': doc.mimeType, 'Content-Disposition': 'attachment', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  return res.send(decryptDocument(doc));
});
router.post('/verifications/:id/decision', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/admin/verifications');
  const car = await Car.findOne({ _id: req.params.id, seller: { $ne: null }, approvalStatus: 'pending' });
  if (!car) { req.flash('error', 'Only pending seller listings can be reviewed.'); return res.redirect('/admin/verifications'); }
  const decision = String(req.body.decision || '');
  const note = String(req.body.note || '').trim().slice(0, 500);
  if (!['approved', 'rejected'].includes(decision)) { req.flash('error', 'Invalid decision.'); return res.redirect(`/admin/verifications/${car._id}`); }
  if (decision === 'rejected' && !note) { req.flash('error', 'Give a reason for rejection.'); return res.redirect(`/admin/verifications/${car._id}`); }
  if (decision === 'approved') {
    const types = await ListingDocument.distinct('type', { car: car._id });
    if (!['cnic','registration','numberPlate'].every(type => types.includes(type))) { req.flash('error', 'All three verification documents are required before approval.'); return res.redirect(`/admin/verifications/${car._id}`); }
  }
  car.approvalStatus = decision;
  car.verificationNotes = decision === 'rejected' ? note : '';
  car.verifiedBy = req.session.user.id;
  car.verifiedAt = new Date();
  await car.save();
  await Promise.allSettled([notify(car.seller,'listing',`Your ${car.brand} ${car.model} listing was ${decision}${note?': '+note:''}`,`/seller`)]);
  req.flash('success', `Listing ${decision}.`);
  return res.redirect('/admin/verifications');
});

router.get('/bookings', async (req, res) => {
  const status = String(req.query.status || '');
  const allowed = ['pending', 'approved', 'rejected', 'cancelled'];
  const filter = allowed.includes(status) ? { status } : {};
  const bookings = await Booking.find(filter).populate('user', 'name email').populate('car', 'brand model').sort({ createdAt: -1 }).lean({ virtuals: true });
  res.render('admin-bookings', { pageTitle: 'Manage Bookings - Drive Mart', bookings, status, allowed });
});

router.post('/bookings/:id/status', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) { req.flash('error', 'Invalid booking update.'); return res.redirect('/admin/bookings'); }
  const newStatus = String(req.body.status || '');
  if (!['approved', 'rejected', 'pending', 'cancelled'].includes(newStatus)) { req.flash('error', 'Invalid booking update.'); return res.redirect('/admin/bookings'); }
  const booking = await Booking.findById(req.params.id);
  if (!booking) { req.flash('error', 'Booking not found.'); return res.redirect('/admin/bookings'); }
  const car = await Car.findById(booking.car);
  if (!car) { req.flash('error', 'Associated car not found.'); return res.redirect('/admin/bookings'); }
  const oldStatus = booking.status;
  try {
    if (newStatus === 'approved') {
      if (car.status === 'sold') throw new Error('A sold car cannot have an approved booking.');
      const another = await Booking.exists({ car: booking.car, status: 'approved', _id: { $ne: booking._id } });
      if (another) throw new Error('Another booking is already approved for this car.');
    }
    booking.status = newStatus;
    await booking.save();
    if (newStatus === 'approved') {
      car.status = 'booked'; await car.save();
    } else if (oldStatus === 'approved') {
      const remaining = await Booking.exists({ car: booking.car, status: 'approved' });
      if (!remaining && car.status === 'booked') { car.status = 'available'; await car.save(); }
    }
    await Promise.allSettled([notify(booking.user,'booking',`Your booking for ${car.brand} ${car.model} was ${newStatus}.`,'/bookings')]);
    req.flash('success', 'Booking status updated.');
  } catch (error) {
    req.flash('error', error?.code === 11000 ? 'Another booking is already approved for this car.' : error.message || 'Booking status could not be updated.');
  }
  return res.redirect('/admin/bookings');
});

router.post('/bookings/:id/delete', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/admin/bookings');
  const booking = await Booking.findById(req.params.id);
  if (!booking) { req.flash('error', 'Booking not found.'); return res.redirect('/admin/bookings'); }
  const wasApproved = booking.status === 'approved';
  const carId = booking.car;
  await booking.deleteOne();
  if (wasApproved) {
    const remaining = await Booking.exists({ car: carId, status: 'approved' });
    if (!remaining) await Car.updateOne({ _id: carId, status: 'booked' }, { $set: { status: 'available' } });
  }
  req.flash('success', 'Booking deleted.');
  return res.redirect('/admin/bookings');
});

router.get('/cars/new', (req, res) => {
  res.render('car-form', { pageTitle: 'Add Car - Drive Mart', mode: 'add', error: '', car: { brand: '', model: '', year: new Date().getFullYear(), price: '', description: '', status: 'available', image: '' } });
});

router.post('/cars', carImageUpload, verifyCsrf, async (req, res) => {
  const { values, error } = validateCar(req.body, true, req.file, req.uploadError);
  if (error) return res.status(422).render('car-form', { pageTitle: 'Add Car - Drive Mart', mode: 'add', error, car: values });
  let uploaded,gallery=[];
  try {
    uploaded = await uploadCarImage(req.file);
    gallery=await uploadGalleryImages(req.files?.gallery||[]);
    await Car.create({ ...values, ...uploaded,gallery });
    req.flash('success', 'Car added successfully.');
    return res.redirect('/inventory');
  } catch (err) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    await Promise.allSettled(gallery.map(i=>deleteCarImage(i.url,i.publicId)));
    return res.status(500).render('car-form', { pageTitle: 'Add Car - Drive Mart', mode: 'add', error: err.message || 'Car could not be added.', car: values });
  }
});

router.get('/cars/:id/edit', async (req, res) => {
  if (!isObjectId(req.params.id)) { req.flash('error', 'Invalid car selected.'); return res.redirect('/inventory'); }
  const car = await Car.findById(req.params.id).lean();
  if (!car) { req.flash('error', 'Car not found.'); return res.redirect('/inventory'); }
  return res.render('car-form', { pageTitle: 'Edit Car - Drive Mart', mode: 'edit', error: '', car });
});

router.post('/cars/:id', carImageUpload, verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/inventory');
  const existing = await Car.findById(req.params.id);
  if (!existing) { req.flash('error', 'Car not found.'); return res.redirect('/inventory'); }
  const { values, error } = validateCar(req.body, false, req.file, req.uploadError);
  if (error) return res.status(422).render('car-form', { pageTitle: 'Edit Car - Drive Mart', mode: 'edit', error, car: { ...existing.toObject(), ...values } });
  let uploaded,gallery=[];
  try {
    if (req.file) uploaded = await uploadCarImage(req.file);
    gallery=await uploadGalleryImages(req.files?.gallery||[]);
    const remove=Array.isArray(req.body.removeGallery)?req.body.removeGallery:[req.body.removeGallery].filter(Boolean);
    const removed=(existing.gallery||[]).filter(i=>remove.includes(i.url));
    const kept=(existing.gallery||[]).filter(i=>!remove.includes(i.url));
    if(kept.length+gallery.length>4)throw new Error('Maximum 5 photos total.');
    const approvedBooking = await Booking.exists({ car: existing._id, status: 'approved' });
    if (approvedBooking && values.status !== 'booked') throw new Error('This car has an approved booking, so its status must remain booked.');
    const oldImage = { image: existing.image, imagePublicId: existing.imagePublicId };
    Object.assign(existing, values, uploaded || {});
    existing.gallery=[...kept,...gallery];
    await existing.save();
    await Promise.allSettled(removed.map(i=>deleteCarImage(i.url,i.publicId)));
    if (uploaded) {
      const sharedImage = await Car.exists({ _id: { $ne: existing._id }, image: oldImage.image });
      if (!sharedImage) await deleteCarImage(oldImage.image, oldImage.imagePublicId);
    }
    req.flash('success', 'Car updated successfully.');
    return res.redirect(`/cars/${existing._id}`);
  } catch (err) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    await Promise.allSettled(gallery.map(i=>deleteCarImage(i.url,i.publicId)));
    return res.status(500).render('car-form', { pageTitle: 'Edit Car - Drive Mart', mode: 'edit', error: err.message || 'Car could not be updated.', car: { ...existing.toObject(), ...values } });
  }
});

router.post('/cars/:id/delete', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/inventory');
  const car = await Car.findById(req.params.id);
  if (car) {
    const sharedImage = await Car.exists({ _id: { $ne: car._id }, image: car.image });
    await Booking.deleteMany({ car: car._id });
    await ListingDocument.deleteMany({ car: car._id });
    await car.deleteOne();
    if (!sharedImage) await deleteCarImage(car.image, car.imagePublicId);
    await Promise.allSettled((car.gallery||[]).map(i=>deleteCarImage(i.url,i.publicId))); 
    req.flash('success', 'Car deleted successfully.');
  }
  return res.redirect('/inventory');
});

module.exports = router;

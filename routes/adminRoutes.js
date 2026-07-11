const express = require('express');
const Car = require('../models/Car');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { carImageUpload } = require('../middleware/upload');
const { uploadCarImage, deleteCarImage } = require('../services/storage');
const { isObjectId } = require('../utils/helpers');

const router = express.Router();
router.use(requireAdmin);

function validateCar(body, imageRequired, file, uploadError) {
  const values = {
    brand: String(body.brand || '').trim(), model: String(body.model || '').trim(),
    year: Number(body.year), price: Number(body.price), description: String(body.description || '').trim(),
    status: String(body.status || 'available')
  };
  const maxYear = new Date().getFullYear() + 1;
  let error = uploadError || '';
  if (!error && (!values.brand || !values.model)) error = 'Brand and model are required.';
  else if (!error && (!Number.isInteger(values.year) || values.year < 1900 || values.year > maxYear)) error = 'Enter a valid model year.';
  else if (!error && (!Number.isFinite(values.price) || values.price < 0)) error = 'Enter a valid price.';
  else if (!error && !['available', 'booked', 'sold'].includes(values.status)) error = 'Invalid car status.';
  else if (!error && imageRequired && !file) error = 'Please choose a valid car image.';
  return { values, error };
}

router.get('/', async (req, res) => {
  const [users, cars, bookings, pending, recent] = await Promise.all([
    User.countDocuments(), Car.countDocuments(), Booking.countDocuments(), Booking.countDocuments({ status: 'pending' }),
    Booking.find().populate('user', 'name').populate('car', 'brand model').sort({ createdAt: -1 }).limit(6).lean({ virtuals: true })
  ]);
  res.render('admin-dashboard', { pageTitle: 'Admin Dashboard - Drive Mart', stats: { users, cars, bookings, pending }, recent });
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
  let uploaded;
  try {
    uploaded = await uploadCarImage(req.file);
    await Car.create({ ...values, ...uploaded });
    req.flash('success', 'Car added successfully.');
    return res.redirect('/inventory');
  } catch (err) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
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
  let uploaded;
  try {
    if (req.file) uploaded = await uploadCarImage(req.file);
    const approvedBooking = await Booking.exists({ car: existing._id, status: 'approved' });
    if (approvedBooking && values.status !== 'booked') throw new Error('This car has an approved booking, so its status must remain booked.');
    const oldImage = { image: existing.image, imagePublicId: existing.imagePublicId };
    Object.assign(existing, values, uploaded || {});
    await existing.save();
    if (uploaded) {
      const sharedImage = await Car.exists({ _id: { $ne: existing._id }, image: oldImage.image });
      if (!sharedImage) await deleteCarImage(oldImage.image, oldImage.imagePublicId);
    }
    req.flash('success', 'Car updated successfully.');
    return res.redirect(`/cars/${existing._id}`);
  } catch (err) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    return res.status(500).render('car-form', { pageTitle: 'Edit Car - Drive Mart', mode: 'edit', error: err.message || 'Car could not be updated.', car: { ...existing.toObject(), ...values } });
  }
});

router.post('/cars/:id/delete', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/inventory');
  const car = await Car.findById(req.params.id);
  if (car) {
    const sharedImage = await Car.exists({ _id: { $ne: car._id }, image: car.image });
    await Booking.deleteMany({ car: car._id });
    await car.deleteOne();
    if (!sharedImage) await deleteCarImage(car.image, car.imagePublicId);
    req.flash('success', 'Car deleted successfully.');
  }
  return res.redirect('/inventory');
});

module.exports = router;

const express = require('express');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const { requireLogin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { isObjectId, todayInput, parseDateInput } = require('../utils/helpers');

const router = express.Router();
router.use(requireLogin);

async function loadAvailableCar(req, res) {
  if (!isObjectId(req.params.id)) { req.flash('error', 'Invalid car selected.'); res.redirect('/inventory'); return null; }
  const car = await Car.findById(req.params.id).lean();
  if (!car) { req.flash('error', 'Car not found.'); res.redirect('/inventory'); return null; }
  if (car.status !== 'available') { req.flash('error', 'This car is not currently available for booking.'); res.redirect(`/cars/${car._id}`); return null; }
  return car;
}

router.get('/cars/:id/book', async (req, res) => {
  const car = await loadAvailableCar(req, res);
  if (!car) return;
  return res.render('booking-form', { pageTitle: `Book ${car.brand} ${car.model}`, car, error: '', values: { phone: '', preferred_date: todayInput() } });
});

router.post('/cars/:id/book', verifyCsrf, async (req, res) => {
  const car = await loadAvailableCar(req, res);
  if (!car) return;
  const phone = String(req.body.phone || '').trim();
  const preferredDateText = String(req.body.preferred_date || '');
  const preferredDate = parseDateInput(preferredDateText);
  let error = '';
  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) error = 'Enter a valid phone number (7 to 20 characters).';
  else if (!preferredDate || preferredDateText < todayInput()) error = 'Preferred date cannot be in the past.';
  else if (await Booking.exists({ car: car._id, user: req.session.user.id, status: { $in: ['pending', 'approved'] } })) error = 'You already have an active booking for this car.';
  if (error) return res.status(422).render('booking-form', { pageTitle: `Book ${car.brand} ${car.model}`, car, error, values: { phone, preferred_date: preferredDateText || todayInput() } });
  await Booking.create({ car: car._id, user: req.session.user.id, phone, preferredDate, status: 'pending' });
  req.flash('success', 'Booking submitted. The admin will review it shortly.');
  return res.redirect('/bookings');
});

router.get('/bookings', async (req, res) => {
  const bookings = await Booking.find({ user: req.session.user.id }).populate('car').sort({ createdAt: -1 }).lean({ virtuals: true });
  return res.render('my-bookings', { pageTitle: 'My Bookings - Drive Mart', bookings });
});

router.post('/bookings/:id/cancel', verifyCsrf, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect('/bookings');
  const booking = await Booking.findOne({ _id: req.params.id, user: req.session.user.id, status: { $in: ['pending', 'approved'] } });
  if (!booking) { req.flash('error', 'Booking could not be cancelled.'); return res.redirect('/bookings'); }
  const wasApproved = booking.status === 'approved';
  booking.status = 'cancelled';
  await booking.save();
  if (wasApproved) {
    const remaining = await Booking.exists({ car: booking.car, status: 'approved' });
    if (!remaining) await Car.updateOne({ _id: booking.car, status: 'booked' }, { $set: { status: 'available' } });
  }
  req.flash('success', 'Booking cancelled.');
  return res.redirect('/bookings');
});

module.exports = router;

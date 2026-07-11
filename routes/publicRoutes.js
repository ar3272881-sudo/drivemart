const express = require('express');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Subscriber = require('../models/Subscriber');
const { requireLogin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { escapeRegex, isObjectId } = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  const featured = await Car.find({ status: 'available' }).sort({ createdAt: -1 }).limit(6).lean();
  res.render('index', { pageTitle: 'Drive Mart | Premium Car Marketplace', hideSimpleFooter: true, featured });
});

router.get('/inventory', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '');
  const allowedStatuses = ['available', 'booked', 'sold'];
  const query = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ brand: pattern }, { model: pattern }, { description: pattern }];
  }
  if (allowedStatuses.includes(status)) query.status = status;
  const cars = await Car.find(query).sort({ createdAt: -1 }).lean();
  res.render('inventory', { pageTitle: 'Inventory - Drive Mart', cars, search, status, allowedStatuses });
});

router.get('/cars/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) { req.flash('error', 'Invalid car selected.'); return res.redirect('/inventory'); }
  const car = await Car.findById(req.params.id).lean();
  if (!car) { req.flash('error', 'Car not found.'); return res.redirect('/inventory'); }
  return res.render('car-details', { pageTitle: `${car.brand} ${car.model} - Drive Mart`, car });
});

router.get('/dashboard', requireLogin, async (req, res) => {
  const activeBookings = await Booking.countDocuments({ user: req.session.user.id, status: { $in: ['pending', 'approved'] } });
  res.render('dashboard', { pageTitle: 'Dashboard - Drive Mart', activeBookings });
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

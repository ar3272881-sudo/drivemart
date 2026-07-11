const express = require('express');
const rateLimit = require('express-rate-limit');
const Car = require('../models/Car');
const { verifyCsrf } = require('../middleware/csrf');
const { buildReply } = require('../utils/chatbot');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Thora wait karke dobara message bhejein.' } });

router.post('/chatbot', limiter, verifyCsrf, async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message || message.length > 800) return res.status(422).json({ ok: false, error: '1 se 800 characters ka message likhein.' });
  const cars = await Car.find().sort({ price: 1, createdAt: -1 }).limit(100).lean();
  const reply = await buildReply(message, cars, req.session.user || null);
  return res.json({ ok: true, reply, mode: 'free-database-assistant' });
});

module.exports = router;

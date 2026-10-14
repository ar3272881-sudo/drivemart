const express = require('express');
const rateLimit = require('express-rate-limit');
const Car = require('../models/Car');
const { verifyCsrf } = require('../middleware/csrf');
const { buildReply } = require('../utils/chatbot');
const { generateGeminiChat } = require('../services/aiChatbot');

const router = express.Router();
// Bound external API cost and discourage misuse.
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Bohat ziada requests hain. Ek minute baad try karein.' } });

// Booking details are private. Handle locally instead of sending them to Gemini.
function isPrivateBookingRequest(message) {
  return /\b(my bookings?|meri bookings?|booking status|bookings? check|bookings? dikhao|status of my booking|my reservation)\b/i.test(message);
}

router.post('/chatbot', limiter, verifyCsrf, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message || message.length > 800) return res.status(422).json({ ok: false, error: '1 se 800 characters ka message likhein.' });

  const cars = await Car.find({ status: 'available', $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] })
    .select('_id brand model year price mileage condition color status approvalStatus')
    .sort({ price: 1, createdAt: -1 }).limit(100).lean();

  if (isPrivateBookingRequest(message)) {
    const reply = await buildReply(message, cars, req.session.user || null);
    return res.json({ ok: true, reply, mode: 'database' });
  }

  try {
    const result = await generateGeminiChat({ message, cars, history: req.body.history });
    return res.json({ ok: true, ...result });
  } catch (error) {
    // Do not log message, history, private data or API keys. Existing database assistant remains usable.
    console.error('[DriveMart Gemini Chat]', error?.message || 'AI unavailable');
    const reply = await buildReply(message, cars, req.session.user || null);
    return res.json({ ok: true, reply, mode: 'basic', notice: 'Gemini AI temporarily unavailable; showing basic database answer.' });
  }
});

module.exports = router;

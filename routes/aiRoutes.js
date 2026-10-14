const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireLogin, requireSeller } = require('../middleware/auth');
const { carImageUpload } = require('../middleware/upload');
const { verifyCsrf } = require('../middleware/csrf');
const gemini = require('../services/gemini');
const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { ok: false, error: 'Too many AI requests. Please try again later.' } });
router.post('/scan', requireSeller, limiter, carImageUpload, verifyCsrf, async (req, res) => {
  if (req.uploadError || !req.file) return res.status(422).json({ ok: false, error: req.uploadError || 'Upload a vehicle image first.' });
  try { return res.json({ ok: true, car: await gemini.scanCarImage(req.file), note: 'AI guesses can be wrong. Verify details before submitting.' }); }
  catch (e) { return res.status(e.status || 502).json({ ok: false, error: e.message }); }
});
router.post('/estimate', requireLogin, limiter, verifyCsrf, async (req, res) => {
  const car = {
    brand: String(req.body.brand || '').trim().slice(0, 100),
    model: String(req.body.model || '').trim().slice(0, 100),
    year: Number(req.body.year), mileage: Number(req.body.mileage),
    condition: String(req.body.condition || 'good')
  };
  if (!car.brand || !car.model || !Number.isInteger(car.year) || car.year < 1900 || car.year > new Date().getFullYear() + 1 || !Number.isFinite(car.mileage) || car.mileage < 0 || car.mileage > 2000000 || !['excellent','good','fair','needs_work'].includes(car.condition)) {
    return res.status(422).json({ ok: false, error: 'Enter a valid brand, model, year, mileage and condition.' });
  }
  try { return res.json({ ok: true, valuation: await gemini.estimateCarPrice(car) }); }
  catch (e) { return res.status(e.status || 502).json({ ok: false, error: e.message }); }
});
router.get('/status', requireLogin, (req, res) => res.json({ ok: true, configured: gemini.configured() }));
module.exports = router;

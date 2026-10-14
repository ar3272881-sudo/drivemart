const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyCsrf } = require('../middleware/csrf');
const { signJwt } = require('../services/jwt');
const { setAuth, clearAuth } = require('../middleware/identity');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, message: 'Too many login attempts. Please retry in 15 minutes.' });
const redirectForRole = role => role === 'admin' ? '/admin' : role === 'seller' ? '/seller' : '/dashboard';

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect(redirectForRole(req.session.user.role));
  return res.render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error: '', values: { name: '', email: '', role: 'buyer' } });
});
router.post('/register', verifyCsrf, async (req, res) => {
  if (req.session.user) return res.redirect(redirectForRole(req.session.user.role));
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || 'buyer');
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirm_password || '');
  let error = '';
  if (name.length < 2 || name.length > 100) error = 'Name must be between 2 and 100 characters.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) error = 'Please enter a valid email address.';
  else if (!['buyer', 'seller'].includes(role)) error = 'Choose Buyer or Seller account.';
  else if (password.length < 8) error = 'Password must contain at least 8 characters.';
  else if (password !== confirmPassword) error = 'Passwords do not match.';
  else if (await User.exists({ email })) error = 'An account with this email already exists.';
  const values = { name, email, role };
  if (error) return res.status(422).render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error, values });
  try {
    await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
    req.flash('success', 'Account created. Please login.');
    return res.redirect('/login');
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return res.status(422).render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error: 'An account with this email already exists.', values });
  }
});
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(redirectForRole(req.session.user.role));
  return res.render('login', { pageTitle: 'Login - Drive Mart', bodyClass: 'auth-page', error: '', email: '' });
});
router.post('/login', loginLimiter, verifyCsrf, async (req, res) => {
  if (req.session.user) return res.redirect(redirectForRole(req.session.user.role));
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const remember = req.body.remember_me === 'on';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).render('login', { pageTitle: 'Login - Drive Mart', bodyClass: 'auth-page', error: 'Incorrect email address or password.', email });
  }
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  // A signed JWT and a server-side session are both required: revoking the session invalidates the login.
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.session.lastActivity = Date.now();
  req.session.cookie.maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : null;
  const token = signJwt({ sub: user.id, role: user.role }, 7 * 24 * 60 * 60);
  setAuth(res, token, remember);
  req.flash('success', `Welcome back, ${user.name}!`);
  return res.redirect(redirectForRole(user.role));
});
router.post('/logout', verifyCsrf, async (req, res) => {
  await new Promise(resolve => req.session.destroy(() => resolve()));
  clearAuth(res);
  res.clearCookie('drivemart.sid', { path: '/' });
  return res.redirect('/login');
});
module.exports = router;

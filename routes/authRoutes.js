const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/dashboard');
  return res.render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error: '', values: { name: '', email: '' } });
});

router.post('/register', verifyCsrf, async (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirm_password || '');
  let error = '';
  if (name.length < 2 || name.length > 100) error = 'Name must be between 2 and 100 characters.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) error = 'Please enter a valid email address.';
  else if (password.length < 8) error = 'Password must contain at least 8 characters.';
  else if (password !== confirmPassword) error = 'Passwords do not match.';
  else if (await User.exists({ email })) error = 'An account with this email already exists.';

  if (error) return res.status(422).render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error, values: { name, email } });
  try {
    await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'user' });
    req.flash('success', 'Account created successfully. Please login.');
    return res.redirect('/login');
  } catch (err) {
    if (err?.code === 11000) error = 'An account with this email already exists.';
    else throw err;
    return res.status(422).render('register', { pageTitle: 'Register - Drive Mart', bodyClass: 'auth-page', error, values: { name, email } });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/dashboard');
  return res.render('login', { pageTitle: 'Login - Drive Mart', bodyClass: 'auth-page', error: '', email: '' });
});

router.post('/login', verifyCsrf, async (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).render('login', { pageTitle: 'Login - Drive Mart', bodyClass: 'auth-page', error: 'Incorrect email address or password.', email });
  }
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash('success', `Welcome back, ${user.name}!`);
  return res.redirect(user.role === 'admin' ? '/admin' : '/');
});

router.post('/logout', verifyCsrf, async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('drivemart.sid');
  return res.redirect('/login');
});

module.exports = router;

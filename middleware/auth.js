function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please login before continuing.');
    return res.redirect('/login');
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access is required.');
    return res.redirect('/');
  }
  return next();
}

function requireSeller(req, res, next) {
  if (!req.session.user) { req.flash('error', 'Please login as a seller.'); return res.redirect('/login'); }
  if (!['seller', 'admin'].includes(req.session.user.role)) { req.flash('error', 'Seller account required.'); return res.redirect('/dashboard'); }
  return next();
}
module.exports = { requireLogin, requireAdmin, requireSeller };

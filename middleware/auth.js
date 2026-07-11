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

module.exports = { requireLogin, requireAdmin };

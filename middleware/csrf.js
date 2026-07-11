const crypto = require('crypto');

function getCsrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function exposeCsrf(req, res, next) {
  res.locals.csrfToken = getCsrfToken(req);
  next();
}

function verifyCsrf(req, res, next) {
  const supplied = String(req.body?.csrf_token || req.get('x-csrf-token') || '');
  const expected = getCsrfToken(req);
  const valid = supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) {
    if (req.accepts('json') && req.is('application/json')) {
      return res.status(419).json({ ok: false, error: 'Session expired. Page refresh karke dobara try karein.' });
    }
    return res.status(419).render('error', { pageTitle: 'Session Expired', statusCode: 419, message: 'Your session expired. Refresh the page and try again.' });
  }
  return next();
}

module.exports = { exposeCsrf, verifyCsrf, getCsrfToken };

const { verifyJwt } = require('../services/jwt');
const IDLE_MS = 30 * 60 * 1000; // FR02: 30 minute inactivity, including Remember Me sessions.
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = 'drivemart.auth';
function cookieOptions(remember = false) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', ...(remember ? { maxAge: SEVEN_DAYS_MS } : {}) };
}
function clearAuth(res) { res.clearCookie(COOKIE, cookieOptions()); }
function setAuth(res, token, remember) { res.cookie(COOKIE, token, cookieOptions(remember)); }
function getToken(req) {
  const raw = String(req.headers.cookie || '');
  const part = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  if (!part) return '';
  try { return decodeURIComponent(part.slice(COOKIE.length + 1)); } catch { return ''; }
}
function manageIdentity(req, res, next) {
  if (!req.session.user) { if (getToken(req)) clearAuth(res); return next(); }
  const claims = verifyJwt(getToken(req));
  const last = Number(req.session.lastActivity || 0);
  const expired = !last || Date.now() - last >= IDLE_MS;
  if (!claims || claims.sub !== String(req.session.user.id) || claims.role !== req.session.user.role || expired) {
    return req.session.destroy(() => { clearAuth(res); res.clearCookie('drivemart.sid', { path: '/' }); next(); });
  }
  req.session.lastActivity = Date.now();
  next();
}
module.exports = { setAuth, clearAuth, manageIdentity, IDLE_MS, COOKIE };

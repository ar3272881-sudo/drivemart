// Minimal standards-compatible HS256 JWT (no additional dependency).
const crypto = require('crypto');
const ISSUER = 'drivemart';

function secret() {
  const value = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!value || value === 'development-only-change-this-secret') throw new Error('Set a strong JWT_SECRET (and SESSION_SECRET) in .env.');
  return value;
}
function signJwt(payload, lifetimeSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ ...payload, iss: ISSUER, iat: now, exp: now + lifetimeSeconds })).toString('base64url');
  const signed = `${header}.${claims}`;
  const signature = crypto.createHmac('sha256', secret()).update(signed).digest('base64url');
  return `${signed}.${signature}`;
}
function verifyJwt(token) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const expected = crypto.createHmac('sha256', secret()).update(`${parts[0]}.${parts[1]}`).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== ISSUER || typeof claims.sub !== 'string' || !Number.isInteger(claims.exp) || claims.exp <= now || claims.iat > now + 60) return null;
    return claims;
  } catch { return null; }
}
module.exports = { signJwt, verifyJwt };

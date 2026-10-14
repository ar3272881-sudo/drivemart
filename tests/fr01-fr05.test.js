const test = require('node:test');
const assert = require('node:assert/strict');
const { signJwt, verifyJwt } = require('../services/jwt');
const { manageIdentity, IDLE_MS } = require('../middleware/identity');
const gemini = require('../services/gemini');
const { encryptDocument, decryptDocument } = require('../services/documentCrypto');
const fs = require('node:fs');
const path = require('node:path');
process.env.JWT_SECRET = 'testonly-32-char-or-longer-signing-secret-for-ci';

test('FR01 JWT signs and validates subject, role, expiry and tamper resistance', () => {
  const token = signJwt({ sub: 'alice', role: 'seller' }, 60);
  assert.equal(token.split('.').length, 3);
  assert.equal(verifyJwt(token).sub, 'alice');
  assert.equal(verifyJwt(token).role, 'seller');
  assert.equal(verifyJwt(token.slice(0,-4)+'fake'), null);
  assert.equal(verifyJwt(signJwt({ sub: 'bob', role: 'buyer' }, -1)), null);
});

test('FR02 expires session after 30 minutes idle (remember me cannot override)', async () => {
  let destroyed = false, cleared = [];
  const token = signJwt({ sub: 'u1', role: 'buyer' }, 120);
  const req = { session: { user: { id: 'u1', role: 'buyer' }, lastActivity: Date.now()-IDLE_MS-1, destroy(cb) { destroyed = true; cb(); } }, headers: { cookie: `drivemart.auth=${token}` } };
  const res = { clearCookie(name) { cleared.push(name); } };
  await new Promise(resolve => manageIdentity(req, res, resolve));
  assert.equal(destroyed, true);
  assert.ok(cleared.includes('drivemart.auth'));
});

test('FR02 active session remains active and refreshes last activity', async () => {
  const token = signJwt({ sub: 'u2', role: 'seller' }, 120);
  const req = { session: { user: { id: 'u2', role: 'seller' }, lastActivity: Date.now()-100 }, headers: { cookie: `drivemart.auth=${token}` } };
  const res = { clearCookie() { throw new Error('Should not clear live user'); } };
  await new Promise(resolve => manageIdentity(req, res, resolve));
  assert.ok(Date.now()-req.session.lastActivity < 300);
});

test('FR03 Gemini image scan sends an inline image and returns autofill data', async () => {
  const previousFetch = global.fetch; const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fake-test-only';
  global.fetch = async (url, init) => {
    const sent = JSON.parse(init.body);
    assert.ok(url.includes('generateContent'));
    assert.equal(sent.contents[0].parts[1].inlineData.data, Buffer.from('fakejpeg').toString('base64'));
    return { ok: true, json: async () => ({ candidates: [{content: { parts: [{text: JSON.stringify({ brand:'Toyota', model:'Corolla', color:'White', year: 2020, confidence:'medium' }) }] }}] }) };
  };
  try { const scanned = await gemini.scanCarImage({ mimetype:'image/jpeg', buffer:Buffer.from('fakejpeg') }); assert.equal(scanned.model,'Corolla'); assert.equal(scanned.year,2020); }
  finally { global.fetch = previousFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});

test('FR04 estimate returns caveat and estimated range, not a guaranteed market quote', async () => {
  const previousFetch = global.fetch; const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fake-test-only';
  global.fetch = async () => ({ ok:true, json:async() => ({ candidates:[{content:{ parts:[{ text:JSON.stringify({ estimatePKR:4500000, lowPKR:4000000,highPKR:5000000,reason:'Uncertain estimation only.' }) }] }}] }) });
  try { const v = await gemini.estimateCarPrice({ brand:'Toyota',model:'Corolla',year:2020,mileage:60000,condition:'good' }); assert.equal(v.estimatePKR,4500000); assert.match(v.disclaimer,/not a verified/i); }
  finally {global.fetch=previousFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY=oldKey; }
});

test('FR05 verification documents require admin route, are stored in private model not public dir', () => {
  const admin = fs.readFileSync(path.join(__dirname,'../routes/adminRoutes.js'),'utf8');
  const seller = fs.readFileSync(path.join(__dirname,'../routes/sellerRoutes.js'),'utf8');
  const publics = fs.readFileSync(path.join(__dirname,'../routes/publicRoutes.js'),'utf8');
  assert.match(admin,/router\.use\(requireAdmin\)/);
  assert.match(admin,/ListingDocument\.findOne/);
  assert.match(admin,/approvalStatus = decision/);
  assert.match(seller,/approvalStatus: 'pending'/);
  assert.match(publics,/approvalStatus: 'approved'/);
  assert.equal(fs.existsSync(path.join(__dirname,'../public/verification-documents')),false);
});

test('FR05 private documents encrypt at rest and reject tampering', () => {
  const raw = Buffer.from('FAKE TEST DOCUMENT, NOT REAL PERSONAL INFORMATION');
  const encrypted = encryptDocument(raw);
  assert.notDeepEqual(encrypted.data, raw);
  assert.deepEqual(decryptDocument(encrypted), raw);
  const altered = { ...encrypted, data: Buffer.from(encrypted.data) };
  altered.data[0] ^= 255;
  assert.throws(() => decryptDocument(altered));
});

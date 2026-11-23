const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const ResetOtp = require('../models/PasswordResetOtp');
const User = require('../models/User');
const mailer = require('./mailer');
function hash(userId, code) {
  return crypto.createHmac('sha256', process.env.EMAIL_OTP_SECRET || 'not-configured')
    .update(`reset:${userId}:${code}`).digest('hex');
}
function configured() { return mailer.configured() && !!process.env.EMAIL_OTP_SECRET; }
async function sendPasswordOtp(user) {
  if (!configured()) throw Error('Gmail email recovery is not configured. Contact the administrator.');
  const previous = await ResetOtp.findOne({ user: user._id });
  if (previous && Date.now() - previous.sentAt.getTime() < 60000) return false;
  const code = String(crypto.randomInt(100000, 1000000));
  await mailer.sendMail({
    to: user.email,
    subject: 'DriveMart password recovery code',
    text: `Your password recovery code is ${code}. It expires in 10 minutes. Ignore it if you did not request this.`,
  });
  await ResetOtp.findOneAndUpdate(
    { user: user._id },
    { $set: { codeHash: hash(user._id, code), expiresAt: new Date(Date.now() + 600000), sentAt: new Date(), attempts: 0 } },
    { upsert: true }
  );
  return true;
}
async function resetByOtp(email, code, password) {
  if (!/^\d{6}$/.test(code) || password.length < 8 || password.length > 128) return false;
  const user = await User.findOne({ email: email.toLowerCase(), suspended: { $ne: true } });
  if (!user) return false;
  const record = await ResetOtp.findOne({ user: user._id });
  if (!record || record.attempts >= 5 || record.expiresAt.getTime() <= Date.now()) return false;
  record.attempts += 1;
  const expected = Buffer.from(record.codeHash, 'hex');
  const supplied = Buffer.from(hash(user._id, code), 'hex');
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    await record.save(); return false;
  }
  const claimed = await ResetOtp.findOneAndDelete({ _id: record._id, codeHash: record.codeHash, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } });
  if (!claimed) return false;
  await User.updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(password, 12) } });
  await require('../models/PasswordReset').deleteMany({ user: user._id });
  return true;
}
module.exports = { sendPasswordOtp, resetByOtp, configured };

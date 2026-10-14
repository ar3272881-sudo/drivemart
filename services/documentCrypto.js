const crypto = require('node:crypto');
function key() {
  const source = process.env.DOCUMENT_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!source || source.startsWith('replace_with_') || source === 'development-only-change-this-secret') {
    throw new Error('Configure DOCUMENT_SECRET or a strong JWT_SECRET before accepting private documents.');
  }
  // Derive a separate document-encryption key, not the raw JWT signing key.
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(source), Buffer.from('DriveMart-v1'), Buffer.from('private-verification-documents'), 32));
}
function encryptDocument(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { data, iv, tag: cipher.getAuthTag() };
}
function decryptDocument(doc) {
  if (!Buffer.isBuffer(doc.iv) || !Buffer.isBuffer(doc.tag) || !Buffer.isBuffer(doc.data)) throw new Error('Encrypted document data is incomplete.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), doc.iv);
  decipher.setAuthTag(doc.tag);
  return Buffer.concat([decipher.update(doc.data), decipher.final()]);
}
module.exports = { encryptDocument, decryptDocument };

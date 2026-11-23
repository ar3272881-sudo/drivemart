// Gmail delivery through a Google Apps Script Web App.
// Uses Node's built-in fetch + crypto; no Nodemailer or other npm package is required.
const crypto = require('node:crypto');

function configured() {
  return Boolean(
    String(process.env.GMAIL_APPS_SCRIPT_URL || '').trim() &&
    String(process.env.GMAIL_APPS_SCRIPT_SECRET || '').trim()
  );
}

function safeHexHmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function sendMail({ to, subject, text, html }) {
  if (!configured()) {
    throw new Error('Gmail relay is not configured. Set GMAIL_APPS_SCRIPT_URL and GMAIL_APPS_SCRIPT_SECRET.');
  }
  if (typeof fetch !== 'function') {
    throw new Error('This Node.js runtime does not support fetch. Use Node.js 20 or newer.');
  }

  const recipient = String(to || '').trim().toLowerCase();
  if (!validEmail(recipient)) throw new Error('A valid recipient email address is required.');

  const endpoint = String(process.env.GMAIL_APPS_SCRIPT_URL).trim();
  let parsed;
  try { parsed = new URL(endpoint); } catch { throw new Error('GMAIL_APPS_SCRIPT_URL is not a valid URL.'); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    throw new Error('GMAIL_APPS_SCRIPT_URL must be the HTTPS Google Apps Script /exec URL.');
  }

  const secret = String(process.env.GMAIL_APPS_SCRIPT_SECRET).trim();
  const timestamp = Date.now();
  const safeSubject = String(subject || 'DriveMart notification').replace(/[\r\n]+/g, ' ').slice(0, 180);
  const plainText = String(text || '').slice(0, 20000);
  const htmlBody = html ? String(html).slice(0, 50000) : '';
  const senderName = String(process.env.GMAIL_FROM_NAME || 'DriveMart').replace(/[\r\n"\\]/g, '').trim().slice(0, 80) || 'DriveMart';

  // Keep the canonical order identical to Code.gs.
  const canonical = [timestamp, recipient, safeSubject, plainText, htmlBody, senderName].join('\n');
  const signature = safeHexHmac(secret, canonical);
  const payload = { timestamp, to: recipient, subject: safeSubject, text: plainText, html: htmlBody, senderName, signature };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new Error(`Could not reach the Gmail relay: ${error.message}`);
  }

  const responseText = await response.text();
  let result;
  try { result = JSON.parse(responseText); }
  catch { throw new Error(`Gmail relay returned an unexpected response (HTTP ${response.status}). Check the Apps Script deployment URL and access setting.`); }

  if (!response.ok || result.ok !== true) {
    const safeMessage = String(result.error || 'Gmail could not send the message.').slice(0, 240);
    throw new Error(safeMessage);
  }
  return { accepted: [recipient], messageId: result.messageId || null };
}

module.exports = { configured, sendMail };

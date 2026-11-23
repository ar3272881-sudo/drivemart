/**
 * DriveMart Gmail relay.
 * Deploy this Apps Script as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 * Store DRIVEMART_SHARED_SECRET in Project Settings > Script Properties.
 * The same secret goes in Vercel as GMAIL_APPS_SCRIPT_SECRET.
 */
const SECRET_PROPERTY = 'DRIVEMART_SHARED_SECRET';
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function doGet() {
  return jsonOutput({ ok: true, service: 'DriveMart Gmail relay', message: 'POST is required to send email.' });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const secret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);
    if (!secret || !isValidSignature(data, secret)) {
      return jsonOutput({ ok: false, error: 'Unauthorized request.' });
    }

    const to = String(data.to || '').trim().toLowerCase();
    const subject = String(data.subject || 'DriveMart notification').replace(/[\r\n]+/g, ' ').slice(0, 180);
    const body = String(data.text || '').slice(0, 20000);
    const html = String(data.html || '').slice(0, 50000);
    const name = String(data.senderName || 'DriveMart').replace(/[\r\n"\\]/g, '').slice(0, 80) || 'DriveMart';

    if (!isValidEmail(to)) return jsonOutput({ ok: false, error: 'Invalid recipient email.' });
    if (!body && !html) return jsonOutput({ ok: false, error: 'Email body is empty.' });

    const options = { name: name };
    if (html) options.htmlBody = html;
    GmailApp.sendEmail(to, subject, body || 'Please view this email in an HTML-capable email client.', options);
    return jsonOutput({ ok: true });
  } catch (error) {
    console.error('DriveMart Gmail relay error: ' + (error && error.message ? error.message : error));
    // Do not return internal exception details to the public endpoint.
    return jsonOutput({ ok: false, error: 'Gmail delivery failed. Check Gmail permissions and daily sending quota.' });
  }
}

function isValidSignature(data, secret) {
  const timestamp = Number(data && data.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_CLOCK_SKEW_MS) return false;
  const to = String(data.to || '').trim().toLowerCase();
  const subject = String(data.subject || 'DriveMart notification').replace(/[\r\n]+/g, ' ').slice(0, 180);
  const body = String(data.text || '').slice(0, 20000);
  const html = String(data.html || '').slice(0, 50000);
  const name = String(data.senderName || 'DriveMart').replace(/[\r\n"\\]/g, '').slice(0, 80) || 'DriveMart';
  const canonical = [timestamp, to, subject, body, html, name].join('\n');
  const bytes = Utilities.computeHmacSha256Signature(canonical, secret);
  const expected = bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  return constantTimeEquals(expected, String(data.signature || ''));
}

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

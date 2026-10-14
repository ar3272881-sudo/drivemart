const API_TIMEOUT_MS = 20000;
function modelName() {
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid GEMINI_MODEL');
  return model;
}
function configured() { return Boolean(process.env.GEMINI_API_KEY?.trim()); }
async function askGemini(parts, maximumTokens = 300) {
  if (!configured()) { const e = new Error('Gemini is not configured. Add GEMINI_API_KEY in .env.'); e.status = 503; throw e; }
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: maximumTokens } }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch { const e = new Error('AI service could not be reached. Try again later.'); e.status = 502; throw e; }
  if (!response.ok) {
    // The client previously received the same generic message for every Gemini error.
    // Do not log API keys, uploaded images, prompts or request headers.
    let upstream = {};
    try { upstream = await response.json(); } catch { /* empty/non-JSON error body */ }
    const details = upstream?.error || {};
    const upstreamMessage = String(details.message || '').slice(0, 500)
      .replace(/AIza[\w-]{20,}/g, '[REDACTED_KEY]');
    console.error('[Gemini API Error]', {
      httpStatus: response.status,
      code: details.status || 'UNKNOWN',
      model: modelName(),
      message: upstreamMessage || 'No upstream error message'
    });
    const explanations = {
      400: 'Request rejected. Check model settings and the Vercel logs.',
      401: 'API key rejected. Create a valid Gemini API key in Google AI Studio.',
      403: 'API key not authorized or model/project access restricted.',
      404: 'Model not found or not available to this API key.',
      429: 'Quota or rate limit exceeded. Check Google AI Studio usage and billing.',
      500: 'Google AI service encountered an internal error; retry later.',
      503: 'Gemini service temporarily unavailable; retry later.'
    };
    const explanation = explanations[response.status] || 'See Vercel logs for the upstream error.';
    const e = new Error(`Gemini HTTP ${response.status}: ${explanation}`);
    e.status = 502;
    throw e;
  }
  const payload = await response.json();
  const content = payload.candidates?.[0]?.content?.parts?.map(v => v.text || '').join('') || '';
  try { return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
  catch { const e = new Error('AI returned an invalid response. Please try again.'); e.status = 502; throw e; }
}
function short(value, max = 100) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
async function scanCarImage(file) {
  const result = await askGemini([
    { text: 'Look at this vehicle photo. Respond ONLY with a JSON object: {"brand":"", "model":"", "color":"", "year":null, "confidence":"low|medium|high"}. If model/year cannot be reliably determined, leave string empty or year null. Do NOT guess a license plate number, owner details or vehicle identification. Year must be a number or null.' },
    { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } }
  ], 900);
  const year = Number(result.year);
  return {
    brand: short(result.brand), model: short(result.model), color: short(result.color, 60),
    year: Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() + 1 ? year : null,
    confidence: ['low', 'medium', 'high'].includes(result.confidence) ? result.confidence : 'low'
  };
}
async function estimateCarPrice(car) {
  const prompt = `You are estimating used car ASKING prices in Pakistan. Data: ${JSON.stringify(car)}. Give indicative PKR estimate only, NOT a verified market quote. No live listings or market-price database is supplied. If data insufficient, return error rather than fabricated confidence. Respond JSON: {"estimatePKR": number, "lowPKR": number, "highPKR": number, "reason":"one concise sentence"}. Ensure positive plausible numbers, low <= estimate <= high. State in reason that estimate is uncertain and should be checked against live listings.`;
  const result = await askGemini([{ text: prompt }], 900);
  const estimatePKR = Math.round(Number(result.estimatePKR));
  const lowPKR = Math.round(Number(result.lowPKR));
  const highPKR = Math.round(Number(result.highPKR));
  if (![estimatePKR, lowPKR, highPKR].every(n => Number.isFinite(n) && n > 0 && n < 1e10) || lowPKR > estimatePKR || estimatePKR > highPKR) {
    const e = new Error('AI could not produce a usable estimate. Add more car details.'); e.status = 422; throw e;
  }
  return { estimatePKR, lowPKR, highPKR, reason: short(result.reason, 250), disclaimer: 'AI-generated indicative estimate, NOT a verified current Pakistan market price. Compare real listings and inspect the vehicle.' };
}
module.exports = { configured, askGemini, scanCarImage, estimateCarPrice };

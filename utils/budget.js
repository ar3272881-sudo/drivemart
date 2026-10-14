'use strict';

// A deterministic budget parser keeps numeric limits outside the language model.
function extractBudget(input) {
  const text = String(input || '').toLowerCase().replace(/(\d),(?=\d{2,3}\b)/g, '$1').replace(/(?<=\d),(?=\d)/g, '');
  const units = [
    [/(\d+(?:\.\d+)?)\s*(?:crores?|cr|karor|karore|karorh)\b/i, 10000000],
    [/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|lakh|lkh)\b/i, 100000],
    [/(\d+(?:\.\d+)?)\s*(?:millions?|mn)\b/i, 1000000],
    [/(\d+(?:\.\d+)?)\s*(?:thousand|hazaar|hazar|k)\b/i, 1000]
  ];
  for (const [pattern, multiplier] of units) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]) * multiplier;
      return Number.isFinite(value) && value > 0 && value <= 1e9 ? value : null;
    }
  }
  const patterns = [
    /(?:budget|under|below|andar|tak|max|maximum|rs\.?|pkr)\s*(?:rs\.?|pkr)?\s*(\d{6,10})\b/i,
    /\b(?:rs\.?|pkr)\s*(\d{6,10})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      return value > 0 && value <= 1e9 ? value : null;
    }
  }
  return null;
}

module.exports = { extractBudget };

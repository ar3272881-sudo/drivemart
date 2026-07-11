const Booking = require('../models/Booking');

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9.+\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function containsAny(text, phrases) { return phrases.some((phrase) => text.includes(phrase)); }
function money(value) { return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value || 0))}`; }
function carName(car) { return `${car.brand} ${car.model}`.trim(); }
function carLine(car) { return `${carName(car)} (${car.year}) — ${money(car.price)} — ${String(car.status).replace(/^./, (c) => c.toUpperCase())}`; }
function listCars(cars, limit = 6) {
  if (!cars.length) return 'Abhi is category mein koi car listed nahi hai.';
  const lines = cars.slice(0, limit).map((car, index) => `${index + 1}. ${carLine(car)}`);
  if (cars.length > limit) lines.push(`Aur ${cars.length - limit} cars Inventory page par available hain.`);
  return lines.join('\n');
}
function extractBudget(text) {
  const patterns = [
    [/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr|karor|karore)/i, 10000000],
    [/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)/i, 100000],
    [/(\d+(?:\.\d+)?)\s*(?:million|mn)/i, 1000000],
    [/(?:budget|under|below|andar|tak|max|maximum)\s*(?:rs\.?|pkr)?\s*(\d{6,12})/i, 1],
    [/(?:rs\.?|pkr)\s*(\d{6,12})/i, 1]
  ];
  for (const [pattern, multiplier] of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]) * multiplier;
  }
  return null;
}
function findMatchingCars(text, cars) {
  return cars.filter((car) => {
    const brand = String(car.brand || '').toLowerCase();
    const model = String(car.model || '').toLowerCase();
    const full = carName(car).toLowerCase();
    return (brand && text.includes(brand)) || (model.length >= 2 && text.includes(model)) || (full && text.includes(full));
  });
}
async function bookingReply(userId) {
  if (!userId) return 'Apni booking dekhne ke liye pehle login karein. Login ke baad My Bookings par click karein.';
  const bookings = await Booking.find({ user: userId }).populate('car', 'brand model').sort({ createdAt: -1 }).limit(10).lean();
  if (!bookings.length) return 'Aap ki abhi koi booking nahi hai. Inventory se car select karke Book Now karein.';
  return `Aap ki bookings:\n${bookings.map((b) => `#${b.legacyId || String(b._id).slice(-6).toUpperCase()} ${b.car?.brand || 'Deleted'} ${b.car?.model || 'car'} — ${b.status.replace(/^./, (c) => c.toUpperCase())} — Date: ${new Date(b.preferredDate).toISOString().slice(0, 10)}`).join('\n')}`;
}

async function buildReply(message, cars, user) {
  const text = normalize(message);
  const available = cars.filter((car) => car.status === 'available').sort((a, b) => a.price - b.price);
  if (containsAny(text, ['assalam', 'salam', 'hello', 'hi ', 'hey', 'aoa']) || ['hi', 'hello', 'hey'].includes(text)) {
    return `Assalam-o-Alaikum ${user?.name || 'Customer'}! Main Drive Mart ka free smart assistant hoon. Available cars, prices, budget aur booking status ke bare mein pooch sakte hain.`;
  }
  if (containsAny(text, ['thank', 'thanks', 'shukriya', 'jazak'])) return 'Khushi hui madad karke! Cars, prices ya bookings ke bare mein aur sawal pooch sakte hain.';
  if (containsAny(text, ['my booking', 'meri booking', 'booking status', 'bookings dikhao', 'booking check'])) return bookingReply(user?.id);
  if (containsAny(text, ['booking kaise', 'book kaise', 'booking karni', 'how to book', 'book now'])) return 'Booking ka tareeqa:\n1. Inventory open karein\n2. Car par View Details click karein\n3. Book Now select karein\n4. Phone aur preferred date fill karein\n5. Submit karein\nLogin required hai.';
  if (containsAny(text, ['cancel booking', 'booking cancel', 'cancel kaise'])) return 'My Bookings page open karein. Pending ya approved booking ke saamne Cancel Booking par click karein.';
  if (containsAny(text, ['contact', 'phone', 'email', 'support', 'rabta'])) return 'Drive Mart contact:\nPhone: +92 300 1234567\nEmail: info@drivemart.com';
  if (containsAny(text, ['login', 'sign in'])) return 'Login ke liye /login open karein. Account na ho to /register se free account bana sakte hain.';
  if (containsAny(text, ['cheapest', 'lowest price', 'sab se sasti', 'kam price', 'minimum price'])) return available.length ? `Sab se kam price wali available car:\n${carLine(available[0])}\nDetails ke liye Inventory open karein.` : 'Abhi koi available car listed nahi hai.';
  if (containsAny(text, ['expensive', 'highest price', 'sab se mehngi', 'maximum price'])) return available.length ? `Sab se zyada price wali available car:\n${carLine([...available].sort((a,b) => b.price-a.price)[0])}` : 'Abhi koi available car listed nahi hai.';
  const budget = extractBudget(text);
  if (budget !== null) {
    const within = available.filter((car) => car.price <= budget);
    return within.length ? `${money(budget)} ke budget mein yeh available cars hain:\n${listCars(within)}` : `${money(budget)} ke andar abhi koi available car nahi hai.`;
  }
  if (containsAny(text, ['compare', ' vs ', 'versus', 'comparison'])) {
    const matched = findMatchingCars(text, cars);
    if (matched.length >= 2) {
      const [a, b] = matched;
      const cheaper = a.price <= b.price ? carName(a) : carName(b);
      return `${carLine(a)}\n${carLine(b)}\n${cheaper} ${money(Math.abs(a.price - b.price))} kam price hai.`;
    }
    return 'Comparison ke liye do car names likhein, jaise: Honda City vs BMW X9.';
  }
  if (containsAny(text, ['available car', 'cars dikhao', 'car dikhao', 'inventory', 'show cars', 'list cars'])) return `Available cars:\n${listCars(available)}`;
  if (containsAny(text, ['brands', 'brand kaun', 'companies'])) {
    const brands = [...new Set(cars.map((car) => car.brand))].sort();
    return brands.length ? `Drive Mart par listed brands: ${brands.join(', ')}.` : 'Abhi koi brand listed nahi hai.';
  }
  if (containsAny(text, ['kitni cars', 'how many cars', 'total cars', 'car count'])) return `Total ${cars.length} cars listed hain, jin mein se ${available.length} available hain.`;
  const matched = findMatchingCars(text, cars);
  if (matched.length) return `Matching car details:\n${listCars(matched)}`;
  if (containsAny(text, ['price', 'qeemat', 'cost', 'rate'])) return "Car ka brand ya model bhi likhein, jaise: Honda City price.\nYa '50 lakh ke andar cars' pooch sakte hain.";
  return 'Main in sawalon mein madad kar sakta hoon:\n• Available cars dikhao\n• Sab se kam price wali car\n• 50 lakh ke andar cars\n• Honda City price\n• Meri booking status\n• Booking kaise karun?';
}

module.exports = { buildReply };

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Subscriber = require('../models/Subscriber');

async function seed() {
  await connectDatabase();
  await Promise.all([Booking.deleteMany({}), Car.deleteMany({}), User.deleteMany({}), Subscriber.deleteMany({})]);
  const [admin, user] = await User.create([
    { legacyId: 1, name: 'Ali Admin', email: 'abc@gmail.com', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'admin' },
    { legacyId: 2, name: 'Ahmed User', email: 'mjy@gmail.com', passwordHash: await bcrypt.hash('User@123', 12), role: 'user' }
  ]);
  const cars = await Car.create([
    { legacyId: 2, brand: 'BMW', model: 'X9', year: 2024, price: 10000000, image: '1722429614603DeWatermark.ai_1713610471502.jpg', description: 'A premium luxury SUV with modern styling and comfortable interior.', status: 'booked' },
    { legacyId: 3, brand: 'JAECOO', model: 'J8', year: 2026, price: 9600000, image: 'Screenshot-2026-01-01-172811.png', description: 'A spacious SUV designed for comfort, technology, and everyday driving.', status: 'available' },
    { legacyId: 4, brand: 'Ferrari', model: 'SF90', year: 2020, price: 20000000, image: '01_Ferrari_SF90_03.webp', description: 'High-performance sports car with striking design and premium engineering.', status: 'available' },
    { legacyId: 5, brand: 'Honda', model: 'City DSI', year: 2007, price: 2200000, image: 'Cover.jpg', description: 'Reliable and economical family sedan in good condition.', status: 'available' },
    { legacyId: 6, brand: 'Chevrolet', model: 'M5', year: 2021, price: 9000000, image: 'Screenshot-2026-01-01-172811.png', description: 'Modern SUV with a spacious cabin and confident road presence.', status: 'available' }
  ]);
  const byLegacy = Object.fromEntries(cars.map((car) => [car.legacyId, car]));
  await Booking.create([
    { legacyId: 1, car: byLegacy[3]._id, user: user._id, phone: '+92 300 1234567', preferredDate: new Date('2026-07-15T00:00:00.000Z'), status: 'pending', createdAt: new Date('2026-07-10T14:22:42.000Z') },
    { legacyId: 2, car: byLegacy[2]._id, user: user._id, phone: '+92 311 7896666', preferredDate: new Date('2026-07-18T00:00:00.000Z'), status: 'approved', createdAt: new Date('2026-07-11T07:45:06.000Z') }
  ]);
  console.log('Drive Mart MongoDB seed complete.');
  console.log('Admin: abc@gmail.com / Admin@123');
  console.log('User:  mjy@gmail.com / User@123');
  process.exit(0);
}
seed().catch((error) => { console.error(error); process.exit(1); });

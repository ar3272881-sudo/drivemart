const express = require('express');
const Car = require('../models/Car');
const ListingDocument = require('../models/ListingDocument');
const { requireSeller } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { sellerUpload } = require('../middleware/sellerUpload');
const { uploadCarImage, deleteCarImage } = require('../services/storage');
const { isObjectId } = require('../utils/helpers');
const { encryptDocument } = require('../services/documentCrypto');
const router = express.Router();
router.use(requireSeller);
const emptyCar = () => ({ city: '', brand: '', model: '', year: '', color: '', mileage: 0, condition: 'good', price: '', description: '' });
const firstFile = (req, name) => req.files?.[name]?.[0];
function fieldsFrom(body) {
  return {
    city: String(body.city || '').trim().slice(0,80), brand: String(body.brand || '').trim(), model: String(body.model || '').trim(),
    year: Number(body.year), color: String(body.color || '').trim(),
    mileage: Number(body.mileage), condition: String(body.condition || 'good'),
    price: Number(body.price), description: String(body.description || '').trim()
  };
}
function validate(req, v, fresh) {
  if (req.uploadError) return req.uploadError;
  if (!v.brand || v.brand.length > 100 || !v.model || v.model.length > 100) return 'Brand and model are required (up to 100 characters).';
  if (!Number.isInteger(v.year) || v.year < 1900 || v.year > new Date().getFullYear() + 1) return 'Enter a valid year.';
  if (v.color.length > 60) return 'Color is too long.';
  if (!Number.isFinite(v.mileage) || v.mileage < 0 || v.mileage > 2000000) return 'Enter valid mileage.';
  if (!['excellent','good','fair','needs_work'].includes(v.condition)) return 'Invalid condition.';
  if (!Number.isFinite(v.price) || v.price <= 0) return 'Enter a positive selling price.';
  if (v.description.length > 2000) return 'Description must be under 2000 characters.';
  if (fresh && !firstFile(req, 'image')) return 'Upload a car photo.';
  if (fresh && !['cnic','registration','numberPlate'].every(name => firstFile(req,name))) return 'CNIC, registration document and number plate photo are required.';
  return '';
}
async function saveDocuments(req, carId) {
  for (const type of ['cnic','registration','numberPlate']) {
    const file = firstFile(req, type);
    if (!file) continue;
    await ListingDocument.findOneAndUpdate(
      { car: carId, type },
      { $set: { uploader: req.session.user.id, filename: file.originalname.slice(0,255), mimeType: file.mimetype, ...encryptDocument(file.buffer) } },
      { upsert: true, new: true, runValidators: true }
    );
  }
}
router.get('/', async (req, res) => {
  const cars = await Car.find({ seller: req.session.user.id }).sort({ createdAt: -1 }).lean();
  res.render('seller-dashboard', { pageTitle: 'Seller Dashboard - Drive Mart', cars });
});
router.get('/cars/new', (req, res) => res.render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error: '', car: emptyCar() }));
router.post('/cars', sellerUpload, verifyCsrf, async (req, res) => {
  const values = fieldsFrom(req.body);
  const error = validate(req, values, true);
  if (error) return res.status(422).render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error, car: values });
  let uploaded;
  let car;
  try {
    uploaded = await uploadCarImage(firstFile(req, 'image'));
    car = await Car.create({ ...values, ...uploaded, seller: req.session.user.id, approvalStatus: 'pending', status: 'available' });
    await saveDocuments(req, car._id);
    req.flash('success', 'Listing submitted as Pending. Admin will review your verification documents.');
    return res.redirect('/seller');
  } catch {
    if (car) { await ListingDocument.deleteMany({ car: car._id }).catch(() => {}); await Car.deleteOne({ _id: car._id }).catch(() => {}); }
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    return res.status(500).render('seller-car-form', { pageTitle: 'Submit Car - Drive Mart', mode: 'add', error: 'Could not save listing. Please try again.', car: values });
  }
});
async function rejectedOwnedCar(req) {
  if (!isObjectId(req.params.id)) return null;
  return Car.findOne({ _id: req.params.id, seller: req.session.user.id, approvalStatus: 'rejected' });
}
router.get('/cars/:id/edit', async (req, res) => {
  const car = await rejectedOwnedCar(req);
  if (!car) { req.flash('error', 'Only rejected seller listings may be edited.'); return res.redirect('/seller'); }
  return res.render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error: '', car: car.toObject() });
});
router.post('/cars/:id/resubmit', sellerUpload, verifyCsrf, async (req, res) => {
  const car = await rejectedOwnedCar(req);
  if (!car) { req.flash('error', 'Listing no longer eligible for resubmission.'); return res.redirect('/seller'); }
  const values = fieldsFrom(req.body);
  const error = validate(req, values, false);
  if (error) return res.status(422).render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error, car: { ...car.toObject(), ...values } });
  let uploaded;
  try {
    if (firstFile(req,'image')) uploaded = await uploadCarImage(firstFile(req,'image'));
    await saveDocuments(req, car._id);
    const docTypes = await ListingDocument.distinct('type', { car: car._id });
    if (!['cnic','registration','numberPlate'].every(t => docTypes.includes(t))) throw new Error('Missing verification documents.');
    const previous = { image: car.image, imagePublicId: car.imagePublicId };
    Object.assign(car, values, uploaded || {});
    car.approvalStatus = 'pending'; car.verificationNotes = ''; car.verifiedBy = null; car.verifiedAt = null;
    await car.save();
    if (uploaded) await deleteCarImage(previous.image, previous.imagePublicId);
    req.flash('success', 'Edited listing resubmitted for admin review.');
    return res.redirect('/seller');
  } catch (e) {
    if (uploaded) await deleteCarImage(uploaded.image, uploaded.imagePublicId);
    return res.status(422).render('seller-car-form', { pageTitle: 'Edit & Resubmit Car - Drive Mart', mode: 'edit', error: e.message || 'Update failed.', car: { ...car.toObject(), ...values } });
  }
});
module.exports = router;

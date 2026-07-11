const path = require('path');
const mongoose = require('mongoose');

function formatMoney(value) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value, includeTime = false) {
  if (!value) return '';
  const options = includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(new Date(value));
}

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
}

function imageSrc(image) {
  const value = String(image || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value) return `/uploads/${encodeURIComponent(path.basename(value))}`;
  return '/img/download-bmw-car-png-image-0.png';
}

function isObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = { formatMoney, formatDate, dateInput, imageSrc, isObjectId, escapeRegex, todayInput, parseDateInput };

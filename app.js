require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { connectDatabase } = require('./config/db');
const flashMiddleware = require('./middleware/flash');
const { exposeCsrf } = require('./middleware/csrf');
const helpers = require('./utils/helpers');

const app = express();
const databasePromise = connectDatabase();
const sessionStore = MongoStore.create({
  clientPromise: databasePromise.then((connection) => connection.getClient()),
  ttl: 7 * 24 * 60 * 60
});
sessionStore.on('error', (error) => console.error('Session store error:', error.message));

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '20kb' }));
app.use(session({
  name: 'drivemart.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(flashMiddleware);
app.use(exposeCsrf);
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === 'admin';
  res.locals.currentYear = new Date().getFullYear();
  res.locals.pageTitle = 'Drive Mart';
  res.locals.bodyClass = '';
  res.locals.hideSimpleFooter = false;
  Object.assign(res.locals, helpers);
  next();
});

app.use((req, res, next) => databasePromise.then(() => next()).catch(next));
app.use(require('./routes/authRoutes'));
app.use(require('./routes/publicRoutes'));
app.use(require('./routes/bookingRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/api', require('./routes/chatbotRoutes'));

// Friendly redirects from the former PHP version.
const legacy = {
  '/index.php': '/', '/inventory.php': '/inventory', '/login.php': '/login', '/register.php': '/register',
  '/dashboard.php': '/dashboard', '/my_bookings.php': '/bookings', '/admin_dashboard.php': '/admin',
  '/admin_bookings.php': '/admin/bookings'
};
for (const [oldPath, newPath] of Object.entries(legacy)) app.get(oldPath, (req, res) => res.redirect(301, newPath));

app.use((req, res) => res.status(404).render('error', { pageTitle: 'Page Not Found', statusCode: 404, message: 'The page you requested could not be found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : error.message;
  return res.status(500).render('error', { pageTitle: 'Server Error', statusCode: 500, message });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  databasePromise.then(() => app.listen(port, () => console.log(`Drive Mart running at http://localhost:${port}`))).catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
}

module.exports = app;

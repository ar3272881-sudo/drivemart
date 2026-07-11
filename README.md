# Drive Mart — Node.js + MongoDB FYP

The original PHP/MySQL project has been converted to:

- Node.js 20+
- Express 5
- MongoDB + Mongoose
- EJS templates
- Session authentication stored in MongoDB
- bcrypt password hashing
- Multer image uploads
- Free database-based chatbot (no paid API)

The original red/black design, images, inventory, bookings, admin panel and chatbot are preserved.

## 1. Install Node.js and MongoDB

Install Node.js 20.19 or newer. Either install MongoDB Community locally or create a free MongoDB Atlas cluster.

## 2. Configure

Copy `.env.example` to `.env` and edit values:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/drivemart
SESSION_SECRET=put_a_long_random_secret_here
```

For Atlas, paste its `mongodb+srv://...` connection string in `MONGODB_URI`.

## 3. Install and seed

```bash
npm install
npm run seed
npm start
```

Open: `http://localhost:3000`

## Test accounts

- Admin: `abc@gmail.com` / `Admin@123`
- User: `mjy@gmail.com` / `User@123`

## GitHub safety

Never upload `.env`. It is already listed in `.gitignore`.

## Vercel note

The project includes `api/index.js` and `vercel.json`. Set `MONGODB_URI`, `SESSION_SECRET`, and `NODE_ENV=production` in Vercel Environment Variables. Local filesystem uploads are not permanent on serverless hosting, so configure the optional Cloudinary variables for new car images:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

The included seed images remain in `public/uploads`; new production uploads use Cloudinary when configured.

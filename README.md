# DriveMart — FR01 to FR05 Enhanced Build

**Frontend:** HTML/CSS/JavaScript and EJS templates (the original project is NOT React/Vite).  
**Backend:** Node.js + Express, MongoDB/Mongoose, bcrypt, signed JWT cookie + server-side session.

This version extends the original inventory, car-details, booking and admin flows with the SRS features FR01–FR05. Existing seeded/admin listings remain public. Seller-created listings are **private Pending** until admin approval.

## Quick start

1. Install **Node.js 20.19+**, MongoDB (local or Atlas), and npm.
2. From the `drivemart` project folder run `npm install`.
3. Copy `.env.example` to `.env`, and configure:
   - `MONGODB_URI`: your MongoDB address.
   - `SESSION_SECRET`: a unique cryptographically random secret (32+ characters).
   - `JWT_SECRET`: a **different** unique random secret (32+ characters).
   - `DOCUMENT_SECRET`: separate strong secret for AES-256-GCM encryption of CNIC and registration files; keep it unchanged after storing documents.
   - `GEMINI_API_KEY`: Google Gemini key for FR03/FR04. Keep this on the server only.
   - Optional `GEMINI_MODEL` (default: `gemini-2.5-flash`), and Cloudinary settings for production car images.
4. **Only on a disposable/demo database:** run `npm run seed` (deletes existing users, cars and bookings!).
5. Run `npm start` then open `http://localhost:3000`.
6. Run `npm test` for built-in tests, and `npm run check` for EJS compilation.

**Warning:** Do not commit `.env` or put an API key in the browser. The included example credentials are development demo accounts; change them before deployment. The `npm run seed` command is destructive.

## New features (SRS FR01–FR05)

- **FR01:** Register as Buyer or Seller; bcrypt-hashed password; JWT in an HttpOnly cookie and a server-side session; admin role is created only by trusted database seeding/administration. Protected routes.
- **FR02:** Activity timestamp enforced server-side, 30-minute inactivity logout. "Remember me" keeps cookies across browser restarts up to seven days, **but does not bypass 30-minute inactivity logout**. Server session removal revokes login.
- **FR03:** Seller adds photo and presses "Scan Image with Gemini AI". AI suggests brand, model, color, year. Seller confirms/corrects data manually. Endpoint `POST /api/ai/scan`.
- **FR04:** Seller form and authenticated buyer car-details page have "AI Price Estimate". Endpoint `POST /api/ai/estimate`, returning estimated PKR range with an uncertainty disclaimer. **This is not a verified live-market valuation.**
- **FR05:** Seller car submission with image, CNIC, registration document and plate image. Document binaries are **AES-256-GCM encrypted and private in MongoDB** (not served statically). Car starts `pending`; admin checks three downloads and approves/rejects; only approved cars appear in public homepage, inventory, chatbot and booking flow. Rejected cars can be corrected and resubmitted.

## Demo walkthrough

1. Register a **Seller** account at `/register`, and log in at `/login`.
2. Visit `/seller` > `Submit Car`. Supply photo and all required fields and private documents. If Gemini is configured, demonstrate AI scan and valuation (otherwise, demonstrate manual form without suggesting Gemini works).
3. Submit. Seller dashboard displays **Pending**. Public inventory does **not** show the new car.
4. Log out and log in as **Admin**. Open `/admin/verifications` or dashboard "Seller Approvals".
5. Open pending listing, download/review the private documents and approve. If rejecting, supply a reason; seller can edit and resubmit.
6. Open `/inventory`; approved car is now visible and can be booked using the original booking flow.
7. For FR02, leave the login inactive for 30 minutes, then navigate: the server requires login again.

## Important differences from the old SRS

This codebase is Express + EJS, not React + Vite. AI and verification requirements have been added to the existing application rather than converting its frontend to React. Buyer-seller real-time chat, live bidding, password-reset OTP and other FR06–FR10 features were **not** implemented by this upgrade.

**Known limitations:** Gemini needs an external key and quota and may return wrong car data; users must correct it. Price estimates are indicative, not anchored to live listings. Document checks are performed manually by admin; no direct government verification API is included. Large multipart uploads may exceed serverless hosting limits (e.g. Vercel); for production, use secure cloud direct uploads and protect documents with a private storage policy. MongoDB must be running to perform an end-to-end demonstration.

## Routes added

| Path | Method | Role | Purpose |
|---|---|---|---|
| `/register` | GET/POST | public | Buyer/Seller registration |
| `/login` | GET/POST | public | JWT + session + Remember Me |
| `/seller` | GET | seller/admin | Own submissions and review states |
| `/seller/cars/new` | GET | seller/admin | Submission form |
| `/seller/cars` | POST | seller/admin | Submit new pending listing + documents |
| `/seller/cars/:id/edit` | GET | owner | Edit a rejected listing |
| `/seller/cars/:id/resubmit` | POST | owner | Re-upload corrections for review |
| `/api/ai/scan` | POST | seller/admin | Gemini image extraction |
| `/api/ai/estimate` | POST | logged in | Gemini indicative valuation |
| `/admin/verifications` | GET | admin | Approval queue |
| `/admin/verifications/:id` | GET | admin | Review detail |
| `/admin/verifications/:id/documents/:type` | GET | admin | Private document download |
| `/admin/verifications/:id/decision` | POST | admin | Approve or reject |

**Security:** All modifying form/API endpoints use existing CSRF protection. AI endpoints have rate limits. JWTs are verified per request and checked against a server-side session. Uploaded verification documents are encrypted and private, and admin download endpoints require admin login. All public vehicle queries filter out pending/rejected seller listings.

## Testing

`npm test` checks JWT integrity, active/idle sessions, Gemini API input/output via mock responses, and the approval/permission wiring. `npm run check` compiles EJS views. These tests are not a substitute for verifying MongoDB operations, Cloudinary upload, real Gemini credentials and full UI workflows in the target deployment.

---

# Drive Mart — Node.js + MongoDB FYP

The original PHP/MySQL project has been converted to:

- Node.js 20+
- Express 5
- MongoDB + Mongoose
- EJS templates
- Session authentication stored in MongoDB
- bcrypt password hashing
- Multer image uploads
- Gemini AI chatbot in English/Roman Urdu using approved, available MongoDB car listings, budget-based recommendations and basic database assistant fallback

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


## Gemini AI Chatbot update
The sitewide chatbot on every page uses the existing `POST /api/chatbot` endpoint. Express passes sanitized public car data (not personal user/verification documents) to Google Gemini via the server-only `GEMINI_API_KEY`, and validates recommended vehicle IDs and actual listing prices server-side. Supports English/Roman Urdu, budget input (e.g. `30 lakh`), short in-page conversation history, and an explicit basic-mode fallback if Gemini is unreachable. The new backend helper is `services/aiChatbot.js`, while `public/chatbot.js` and `views/partials/chatbot.ejs` provide the existing UI. See `GEMINI_CHATBOT_SETUP_ROMAN_URDU.md` for GitHub Desktop, Vercel and live testing instructions.

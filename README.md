# DriveMart FYP — Enhanced Marketplace (November 2026)

**Technology:** Node.js 20.19+, Express 5, EJS + CSS/JS, MongoDB/Mongoose, session + signed JWT, Gemini AI. These upgrades use the original project's architecture; they do not replace it with React.

## First run on Windows

1. Install Node.js 20.19 or newer and MongoDB locally, or create a MongoDB Atlas database.
2. Unzip this project. Open its folder in VS Code, then open Terminal.
3. Run `npm install` (internet needed for first install).
4. Run `copy .env.example .env`, then edit `.env` with your MongoDB URI and three **different, long random secrets** for `SESSION_SECRET`, `JWT_SECRET`, and `DOCUMENT_SECRET`. Keep `DOCUMENT_SECRET` stable after uploading verification documents.
5. Run `npm run check` and `npm test`.
6. Run `npm start`, then open `http://localhost:3000`.
7. Optional: add `GEMINI_API_KEY` for car scanning, indicative price estimates and budget-aware chatbot.
8. Optional: configure Resend credentials and `EMAIL_OTP_SECRET` for email OTP password recovery; set `REQUIRE_EMAIL_VERIFICATION=true` only **after** verified outgoing mail is working.
9. Optional: configure Cloudinary credentials for persistent public car photographs on hosted servers. Without Cloudinary, images are stored in local `public/uploads`, which can be lost on stateless/serverless hosting.

**Never run `npm run seed` against existing project data:** the seed script may delete users, cars and bookings. Take a database backup before any migration or deployment.

## What's new in this ZIP

| Feature | Implementation |
|---|---|
| Buyer profile | Update name, city, phone, avatar and password at `/profile`. |
| Favorites | Save/remove public vehicles and manage shortlist at `/favorites`. |
| Recommendations | Suggestions at `/recommendations` and dashboard, ranked using recent views, favorites, city, brand, price and popularity. |
| Seller control | Edit/re-submit any unsold owned car; approved edits return to pending verification. Mark available approved cars sold, delete own cars without approved bookings. |
| Seller analytics | Views, favorites, bids and message counters on seller dashboard. |
| 5-photo gallery | Cover photo + up to 4 additional photos per car. Gallery management for sellers and admins; public detail photo switcher. |
| Advanced search | Brand, city, price min/max, mileage, year min/max, fuel, transmission, body type, status, price/year/popularity sorting, pagination. JS live results with normal GET fallback. |
| Nearby search | Optional seller/admin latitude and longitude + user position + radius up to 500 km. MongoDB 2dsphere index. Only geo-tagged listings appear for nearby queries. Browser location needs HTTPS except localhost. |
| Notifications | Persistent read/unread inbox for messages, bids, listing decisions and bookings. |
| Live messaging and bids | Existing authorized buyer/seller chat and bids retained; HTTP POST sends, server-sent events (SSE) pushes changes to subscribed sessions. Polling fallback if live stream unavailable. Bid history displayed in chat. |
| Email OTP verification | Six-digit, 10-min expiry, retry cap, optional registration verification with Resend; disabled by default until credentials configured. |
| Password reset OTP | Six-digit email recovery code in addition to existing reset-link feature (Resend + `EMAIL_OTP_SECRET` required). |
| Structured car specs | Fuel, gearbox, body style and engine CC in seller/admin forms and public details. |

## Main pages

`/inventory`, `/cars/:id`, `/dashboard`, `/profile`, `/favorites`, `/recommendations`, `/seller`, `/seller/bids`, `/my-bids`, `/chat/inbox`, `/notifications`, `/verify-email`, `/forgot-password`, `/reset-password-otp`, `/admin`, `/admin/verifications`, `/admin/moderation`.

## Security and compatibility

- Seller edit/delete checks ownership. Approved bookings block seller deletion or changes; approved cars sent for re-review are hidden until approved again.
- Private CNIC, registration and plate verification documents remain encrypted using the existing AES-256-GCM mechanism.
- Form and state-changing endpoints still use CSRF protection. Sensitive user and notification routes require login.
- Existing MongoDB `users`, `cars`, `bookings` and verification records remain compatible; Mongoose adds optional fields and new collections (`carviews`, `notifications`, `emailverifications`, `passwordresetotps`).
- Data models can coexist with existing listings, but **backup before migration** and verify indexes after deployment.
- Seller gallery has a 5MB per-file limit; uploads may exceed hosting request size limits. Production hosts should support uploads, HTTPS, MongoDB connectivity and configured secrets.
- **Live updates are SSE, not Socket.io.** They work on a persistent single Node process. Vercel serverless disables the stream and uses 5-second chat polling. Multiple Node instances require a shared event broker for true cross-instance live pushes.

## Testing status

Run `npm test` to run existing tests plus new unit, render and route smoke tests. Run `npm run check` to compile templates. At creation time, 20 tests passed and 33 EJS templates compiled. Tests mock external services and do not replace an end-to-end test with a running MongoDB, authenticated browser sessions, Cloudinary uploads, Gemini and real Resend email delivery.

### Manual checklist with a test database

1. Register a buyer and seller, sign in to each; check profile and favorites.
2. Seller adds a car with cover + gallery + verification files; admin verifies it.
3. Confirm public inventory shows only approved, unhidden cars; test all filters, nearby coordinates and pagination.
4. Open an approved car as buyer; save it, check recommendations, send a chat message and bid.
5. Open as seller in a second browser session; confirm message and bid appear; respond and check notification inbox.
6. Edit an approved seller car; confirm it returns to pending until admin approves. Confirm approved booking protects it from deletion.
7. Configure Resend in a nonproduction account and test one-time codes, expiry, resend limits and password reset.
8. Test local/hosted image persistence, user/administrator permissions and CSRF rejection with a production-like deployment.

## Existing documents

Earlier `EVALUATION_GUIDE_ROMAN_URDU.md`, `FR06-FR10_SETUP_ROMAN_URDU.md`, and `GEMINI_CHATBOT_SETUP_ROMAN_URDU.md` were supplied with the user's original project. Some historical limitation descriptions in those guides predate this enhanced version; use this README for current features.

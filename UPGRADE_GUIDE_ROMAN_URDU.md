# DriveMart FYP — Upgraded Version, Roman Urdu Guide

## Project start karne ka tareeqa

1. **Node.js 20.19+** install karein, aur MongoDB local ya Atlas use karein.
2. ZIP extract kar ke VS Code mein project folder open karein.
3. Terminal mein `npm install` chalayein.
4. `copy .env.example .env` karein. `.env` mein MONGODB_URI, SESSION_SECRET, JWT_SECRET aur DOCUMENT_SECRET set karein. Secrets alag-alag aur strong hon. Purane verification documents use kar rahe hain to DOCUMENT_SECRET change na karein.
5. `npm run check`, `npm test`, phir `npm start` chalayein.
6. Browser par `http://localhost:3000` open karein.

## Kahan kya feature hai?

- **Buyer:** `/profile` (apna naam, city, phone, photo, password), `/favorites` (saved cars), `/recommendations` (personalized cars), `/inventory` (advanced filters aur nearby search).
- **Seller:** `/seller` (My Garage, views, saves, bids, messages, edit, mark sold, delete). `Submit Car` par maximum 5 photos (ek cover + 4 gallery) aur private documents upload karein. Approved car edit karne par admin se dobara approval lena hoga.
- **Messaging:** Car detail par `Chat with Seller`. Chat live updates ke liye SSE use karta hai. Agar persistent connection support na ho to 5 second polling fallback hai. Bid form aur buyer/seller offers existing routes mein hain.
- **Notifications:** `/notifications`; unread counts, messages, bids, approvals aur bookings.
- **Admin:** `/admin`, `/admin/verifications`, `/admin/bookings`, `/admin/moderation`. Existing verification workflow ko remove nahi kiya gaya.
- **Email OTP:** `.env` mein Resend key, RESET_FROM_EMAIL aur EMAIL_OTP_SECRET set karein. Registration verification ke liye `REQUIRE_EMAIL_VERIFICATION=true`; password reset OTP `/forgot-password` se.

## Important: pehle backup

Original MongoDB ka backup zaroor banayein. `npm run seed` existing demo records delete kar sakta hai, isay real data ke sath use na karein. Naye models optional fields aur new collections create karte hain; old records overwrite nahi karne chahiye.

## Test status aur limitations

Code ke 20 automated tests pass hue aur 33 EJS templates compile hue. **Real MongoDB aur live browser email/API workflows yahan execute nahi hue**, is liye local testing aur deployment verification required hai. Gemini API key ke baghair AI tools ka live result nahi milega. Cloudinary ke baghair online hosting par car photos persist nahin ho sakti. Vercel serverless par live SSE unavailable hai, chat polling fallback use karega. Hosted multi-server deployment par event broker chahiye.

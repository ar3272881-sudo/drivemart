# DriveMart FR01-FR05 — Evaluation Guide (Roman Urdu)

## Ek line intro
"DriveMart ek used-car web marketplace hai. Is improved version mein buyer/seller roles, secure login, 30-minute session timeout, Gemini-assisted image autofill and indicative valuation, aur admin-approved seller listings hain."

## 60% frontend evaluation: demo order
1. `/register` — Buyer/Seller dropdown, validation.
2. `/login` — Login form + Remember Me checkbox.
3. `/seller` — Seller Dashboard aur statuses.
4. `/seller/cars/new` — photo, AI Scan, valuation, fields, CNIC, registration, plate photo.
5. `/admin/verifications` — pending queue, detail, protected documents, approve/reject.
6. `/inventory` — approval se pehle hidden, approval ke baad visible.
7. `/cars/:id` — buyer view aur AI estimation card.
8. Chrome DevTools mobile viewport — responsive CSS demonstrate karein.

## File map: evaluator code kholne ko kahe
- `views/register.ejs` + `views/login.ejs` = FR01, FR02 forms
- `routes/authRoutes.js` = registration, bcrypt password hashing, JWT issuance and Remember Me
- `services/jwt.js` = signed token generation and verification
- `middleware/identity.js` = idle timeout enforcement
- `views/seller-car-form.ejs` + `public/ai-tools.js` = FR03/FR04 frontend
- `services/gemini.js` + `routes/aiRoutes.js` = Gemini backend calls
- `models/Car.js` + `models/ListingDocument.js` = approval status and private docs
- `routes/sellerRoutes.js` = pending car submission and resubmission
- `views/admin-verifications.ejs` + `views/admin-verification-detail.ejs` = FR05 admin UI
- `routes/adminRoutes.js` = admin verification logic
- `public/drivemart.css` = styling/responsive layouts

## Viva Q&A
**Q. JWT use kahan hua?** Login par signed JWT HttpOnly cookie mein save hota hai, aur server per request verify karta hai; session ke sath match bhi karta hai. Role authorization backend pe hoti hai.

**Q. Remember Me ka kya kaam hai?** Browser restart hone par cookie persist reh sakti hai; lekin security ke liye 30 minutes inactivity par logout hota hai.

**Q. Gemini API key frontend mein hai?** Nahi. API key `.env` mein backend-side rehti hai. Frontend same-origin `/api/ai/scan` ya `/api/ai/estimate` hit karta hai.

**Q. Car image se year 100% mil jayega?** Nahi; AI guesses can be wrong. Editable form fields seller verify karta hai.

**Q. Price ka estimate accurate hai?** AI-based indicative guidance hai; real Pakistani listings se verify karna zaroori hai. Live-market API integrated nahi.

**Q. Seller ki car public kab hoti hai?** Jab Admin `/admin/verifications` mein private CNIC, registration aur plate image review karke approve kare.

**Q. Documents public directory mein save hain?** Nahi, private MongoDB document model mein AES-256-GCM encrypted format mein stored hain. Sirf admin protected route se download karta hai.

**Q. Existing cars pe effect?** Old/admin cars public rehti hain. Seller-added cars review process se guzarti hain.

**Q. Kya React use kiya?** Nahi. Existing project HTML/CSS/JavaScript + EJS frontend hai. SRS ko implementation se align karna chahiye.

**Q. Kya FR06-FR10 included hain?** Nahi, upgrade sirf FR01-FR05 ke liye hai. Purana booking and chatbot code preserved hai.

## Zaroori setup
`.env.example` copy karein aur real `SESSION_SECRET`, `JWT_SECRET`, `MONGODB_URI`, `GEMINI_API_KEY` set karein. `npm install`, phir `npm start`.
`npm run seed` sirf temporary/demo database mein chalein, existing data delete hota hai.

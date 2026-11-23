# DriveMart Gmail Integration (Nodemailer ke baghair)

Ye patch DriveMart ki existing `mailer.sendMail()` interface ko same rakhta hai, is liye registration verification aur password recovery services ko rewrite karne ki zaroorat nahi.

## ZIP se original project mein paste karne wali files

1. `services/mailer.js` ko original DriveMart ke `services/mailer.js` se replace karein.
2. `views/verify-email.ejs` ko original DriveMart ke `views/verify-email.ejs` se replace karein.
3. Root `package.json` aur `package-lock.json` replace karein. Is patch mein Nodemailer dependency hata di gayi hai; package lock ka root dependency list bhi match karta hai.
4. `google-apps-script/Code.gs` ko Google Apps Script editor mein paste karna hai. Is file ko DriveMart ke `google-apps-script` folder mein rakhne se email relay deploy nahi hota.
5. `.env.example` sirf reference ke liye hai; real `.env` ko replace na karein.

## Google Apps Script setup

1. Usi Gmail account mein sign in karein jis se DriveMart emails bhejna chahta hai.
2. https://script.google.com par New Project banayein.
3. Editor ka default code hata kar `google-apps-script/Code.gs` ka code paste karein aur Save karein.
4. Project Settings (gear) > Script Properties > Add script property:
   - Property: `DRIVEMART_SHARED_SECRET`
   - Value: apna random, lamba secret (kam az kam 32 random bytes ka hex).
5. Deploy > New deployment > Select type: Web app.
6. Execute as: **Me**. Who has access: **Anyone**. Deploy karein aur Google permissions authorize karein.
7. `/exec` par khatam hone wala Web App URL copy karein.

## Vercel Environment Variables

Production environment mein ye variables add karein:

- `GMAIL_APPS_SCRIPT_URL` = Apps Script Web App `/exec` URL
- `GMAIL_APPS_SCRIPT_SECRET` = wohi secret jo Script Properties mein dala
- `GMAIL_FROM_NAME` = `DriveMart` (optional)
- `EMAIL_OTP_SECRET` = alag random secret; Gmail relay secret se different
- `PUBLIC_BASE_URL` = `https://drivemart-iota.vercel.app`
- `REQUIRE_EMAIL_VERIFICATION` = `true` (sirf test email successfully send hone ke baad)

`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RESEND_API_KEY` ki zaroorat nahi.

## Deploy aur test

- Vercel mein variables add karne ke baad redeploy karein.
- Pehle `/verify-email` par logged-in test user se Send / Resend Code try karein.
- Email milne aur OTP verify hone ke baad Forgot Password OTP test karein.
- `REQUIRE_EMAIL_VERIFICATION=true` karne par naye accounts emailVerified=false honge. Pehle test account se confirm karein.

## Security notes

- Shared secret ko browser JavaScript, EJS page ya public GitHub file mein kabhi na rakhein.
- Script ko **Execute as Me** deploy karein; email us Gmail account se jayegi jis account se script owner authorized hai.
- Apps Script web app `Anyone` access use karta hai, lekin request HMAC signature + 5-minute timestamp se authenticate hoti hai. Shared secret sirf Vercel server-side env aur Script Properties mein rakhein.
- Gmail daily sending quotas apply hoti hain. Bulk marketing mail ke liye Gmail relay use na karein.
- Ye relay OTP aur password-reset transactional emails ke liye hai.

# DriveMart — DriveX-inspired UI Redesign

Yeh redesign screenshot ki visual direction follow karta hai: white page layout, dark utility/navigation accents, amber/gold buttons, scenic car hero, compact search strip, vehicle cards, and a dark footer. DriveMart **car marketplace** hai, car-rental website nahin, is liye booking/rental text ko existing buyer/seller system ke mutabiq adapt kiya gaya hai.

## Sabse safe install: UI ONLY patch

1. **GitHub repo ka backup** ya nayi branch `drivemart-ui-redesign` banao. Existing working live deployment ko direct overwrite mat karo.
2. `DriveMart_UI_Only_Patch.zip` extract karo.
3. Iske `views` aur `public` folders ki **andar wali files** apne original DriveMart project ke same locations mein **merge** karo. Pura `views` ya `public` folder delete mat karo.
4. Ye cheezein replace/add hongi:
    - `views/partials/header.ejs`
    - `views/partials/footer.ejs`
    - `views/index.ejs`
    - `public/drivemart-redesign.css` (new)
    - `public/drivemart-redesign.js` (new)
    - `public/fr06-fr10.css` (styling update)
    - `public/img/1.avif` (hero asset)
    - `public/img/23cc1afc-c03c-4f77-868f-f44144d4167c.webp` (promo asset)
5. **Important:** `.env`, `.git`, `app.js`, `routes`, `models`, `services/mailer.js`, `package.json`, `package-lock.json` ko UI-only patch ke saath change karne ki zaroorat nahi. Existing Gmail OTP aur other features unchanged rahenge.
6. Existing VS Code project mein `npm run check`, `npm test`, `npm start` chalao. Local browser mein homepage, Inventory, Login/Register, Car Details, Seller Portal, Admin Dashboard, Chat, Favorites, Email Verification dekh lo.
7. Agar tests successful hon to separate branch push karo. Vercel Preview deployment mein visual test karo. Uske baad Production mein merge karo.

## Site ke navigation aur functional areas

- Main navbar: Home, Vehicles, Featured, Brands, Services, About Us, Contact.
- Account menu: Dashboard, Profile, Saved Cars, Recommendations, Notifications, Bookings, Messages, My Offers, Seller Garage, Received Offers, Admin Panel (applicable user role ke mutabiq).
- Homepage search `GET /inventory` par existing supported parameters `search`, `city`, `minPrice`, `maxPrice` bhejta hai.
- Seller button existing `/seller/cars/new` ya registration par jaata hai.
- Featured cards existing `featured` MongoDB result render karte hain. Preview image mein example cars demonstration ke liye hain; live results database se aayenge.

## Gmail integration

`UI ONLY` patch **Gmail integration code change nahi karta**. Aapke existing `GMAIL_APPS_SCRIPT_URL`, `GMAIL_APPS_SCRIPT_SECRET`, `EMAIL_OTP_SECRET` aur `REQUIRE_EMAIL_VERIFICATION` Vercel environment variables as is rahenge.

## Full project ZIP

`DriveMart_Complete_UI_Redesign.zip` earlier enhanced DriveMart source + Gmail Apps Script patch + redesigned UI par based backup/reconstructed version hai. **Agar aapke live repo mein later code changes hain, full project ZIP directly overwrite mat karna.** Live site ke liye **UI-only patch** recommended hai.

## Limitations

- EJS templates ka syntax check aur desktop/mobile static preview review kiya gaya hai.
- Actual production account permissions, database writes, booking workflow, Gmail delivery aur live MongoDB testing **is environment mein nahi ho sake**.
- CSS external fonts/icons ke liye Google Fonts aur Font Awesome CDN use hota hai. Network block hone par browser fallback fonts dikha sakta hai.

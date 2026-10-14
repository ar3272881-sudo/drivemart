# DriveMart — Gemini AI Chatbot (English + Roman Urdu)

## Kya add hua hai?
- Existing red/black chat widget ko preserve karke Gemini AI assistant attach hua.
- User English ya Roman Urdu mein baat kar sakta hai.
- Budget jaise `30 lakh`, `2.5 crore`, `PKR 30,00,000` local code se parse hota hai.
- Gemini ko **sirf approved + available** listings ke public details milte hain: brand, model, year, listing price, mileage, condition, color.
- AI ke recommended vehicle IDs server database whitelist se validate karta hai. Listing price aur URL server verify karke append karta hai.
- Kisi specific budget par over-budget listing recommend nahi hoti. Budget ke andar kuch nahi ho to direct no-stock response milta hai.
- Booking status query purane local chatbot se handle hoti hai; personal booking records Gemini ko nahi bheje jate.
- Gemini key missing/404/429 ya service error par existing database chatbot ka **basic mode** show hota hai (fake Gemini response nahi).
- Chat history tab ke andar short-term only hai; database mein chat history save nahi hoti.

## GitHub Desktop se deploy (existing repository)
1. ORIGINAL DriveMart project folder ka backup lein.
2. GitHub Desktop > Current Repository `drivemart` > Repository > **Show in Explorer** par click karein.
3. Agar **PATCH ZIP** use kar rahe hain, usko extract karein. ZIP mein jo `drivemart/` folder hai uske **andar ki files** repository folder ke corresponding paths mein copy karein. Files replace karne ke liye Yes.
4. **FULL ZIP** use kar rahe hain to same tarah project content copy karein; `.git`, `.env`, aur `node_modules` ko na replace karein.
5. GitHub Desktop > Changes par ye files show honi chahiye: `routes/chatbotRoutes.js`, `services/aiChatbot.js`, `services/gemini.js`, `utils/budget.js`, `utils/chatbot.js`, `public/chatbot.js`, `public/chatbot.css`, `views/partials/chatbot.ejs`.
6. Summary likhein: `Integrate Gemini AI into DriveMart chatbot`.
7. **Commit to main** > **Push origin**.
8. Vercel Dashboard > DriveMart > Deployments mein new deployment **Ready** hone ka wait karein; auto-deploy off ho to manually redeploy.

## Vercel Environment Variables
- `GEMINI_API_KEY` = real secret key (Vercel > Project > Settings > Environment Variables > Production).
- `GEMINI_MODEL` = `gemini-3.5-flash-lite` (ya koi model jo aapki key par *really* available ho).
- Existing `MONGODB_URI`, `SESSION_SECRET`, `JWT_SECRET`, `DOCUMENT_SECRET` waghera apni config ke mutabiq rehne dein.
- Key ko `.js`, HTML, GitHub ya screenshot mein kabhi paste na karein.
- Environment variable modify karne ke baad **Redeploy** karein.

## Live testing
1. DriveMart homepage open karke chat bubble (`CHAT`) par click karein.
2. `Assalam o alaikum, mera budget 30 lakh hai. Konsi cars hain?` bhejein.
   - AI success: header mein **Gemini AI • Verified DriveMart listings**. Answer Roman Urdu mein; listed cars 30 lakh se mehngi na hon.
3. `I want a car under PKR 40 lakh for city use` bhejein.
   - AI success: English answer + only existing public cars.
4. `Toyota aur Honda mein kya difference hai?` bhejein.
   - General comparison English/Roman Urdu; agar relevant public vehicles hain to verified IDs link text.
5. `Meri booking status dikhao` bhejein (login required).
   - Local database mode mein booking status, **Gemini ko booking data send nahi hota**.
6. Temporarily API unavailable ho to header **Basic mode • Gemini unavailable** aur notice show hoga. This is graceful fallback, NOT proof of Gemini integration working.

## Evaluator viva question
**Q: Chatbot ko Gemini se kaise integrate kiya?**
A: "Our frontend sends a CSRF-protected POST request to `/api/chatbot`. Express fetches approved, available vehicles from MongoDB and passes a sanitized summary with the user's English or Roman Urdu message to Gemini. The server validates recommended car IDs before displaying real listing prices and links. A rule-based assistant is available as fallback."

**Q: Kya chatbot fake car inventory show kar sakta hai?**
A: "Gemini may sometimes make mistakes, so server-side checks restrict displayed recommendations to real, approved, available cars and to the stated budget. The assistant does not replace independent vehicle inspection."

**Q: Kya user ke CNIC ya booking details Google Gemini ko jate hain?**
A: "No. The Gemini prompt includes only sanitized public car fields and redacted chat text. Private booking-status requests are handled locally; we do not send seller verification documents or MongoDB user records."

## Automated tests
`node --test tests/gemini-chatbot.test.js` — six targeted tests. `npm test` runs these plus original tests **after** npm dependencies are installed.

## Notes / limitations
- Gemini integration Google API key, model availability and quota par dependent hai. Backend external Google API availability verify karna zaroori hai.
- Gemini's general advice might be inaccurate. Real car prices shown in server-generated listing lines originate from DriveMart database, not Gemini's estimates.
- Current listing catalog uses up to 100 lowest-priced approved available cars as context, and sends up to 35 relevant items per message; extremely large catalogs would need server-side search/indexing improvements.
- Per-minute request limiter is in-memory per application instance. For production-scale cost control, use shared/durable rate-limit storage and budget limits.
- End-to-end live test on Vercel and real MongoDB/Gemini has not been performed in this environment. Validate on production before evaluation.

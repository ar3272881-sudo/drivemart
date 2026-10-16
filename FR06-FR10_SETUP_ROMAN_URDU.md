# DriveMart FR06 to FR10 — setup

Updated complete project: old EJS + Express system remains. **Do not upload `.env` to GitHub.**

1. ZIP extract karo. Existing repo backup/branch bana kar updated project files replace karo.
2. Existing `.env` apne PC par hi rakho. `npm ci` then `npm test` then `npm start`.
3. FR06: Approved seller car detail -> Chat with Seller, seller `/chat/inbox`, messages refresh every 4 seconds. Vercel-friendly polling (not true push WebSockets).
4. FR07: Car detail -> bid; buyer `/my-bids`; seller `/seller/bids` accept/reject. Acceptance records offer, payment is not processed.
5. FR08: `/inventory` city and min/max price filters. Seller / admin car forms mein City / Location fill karo. Purani listings jinka city blank hai city-search mein nahi aayengi jab tak city update na ki jaye.
6. FR09: `/forgot-password`. Add to Vercel Environment Variables (and local `.env`): `RESEND_API_KEY`, `RESET_FROM_EMAIL` (verified sender), `PUBLIC_BASE_URL` (e.g. https://your-app.vercel.app). Resend email provider account required.
7. FR10: `/admin/moderation`, suspend/reactivate users, hide/unhide listings.
8. Vercel: Node 20+, MongoDB URI / session / JWT etc existing secrets also required. Deploy then test all features with buyer, seller and admin test accounts.

**Important:** Automated checks cannot replace live MongoDB + Resend + Vercel tests. Always test on staging before production.

Existing EJS frontend retained; React migration not included in this feature update.

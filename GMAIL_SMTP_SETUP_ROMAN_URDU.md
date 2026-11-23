# DriveMart Gmail SMTP Setup (Roman Urdu)

Is patch ke baad DriveMart Resend ki jagah aapke Gmail account se verification codes aur password-reset emails bhejega.

## 1. Google account par App Password banao

1. Apne dedicated DriveMart Gmail account mein sign in karo.
2. Google Account > Security & sign-in mein **2-Step Verification** ON karo.
3. `https://myaccount.google.com/apppasswords` kholo.
4. App ka naam `DriveMart Vercel` rakh kar App Password generate karo.
5. Google ka diya hua 16-character App Password copy karo.

**Normal Gmail password use mat karna.** Sirf App Password use karna. App Password option kuch accounts (misal ke taur par Advanced Protection, security-key-only ya kuch work/school accounts) mein available nahi hota. Agar option nahi milta to account security restrictions check karo.

## 2. Patch ko original DriveMart folder mein copy karo

ZIP extract karo. `services`, `routes`, `views`, `tests` ke andar files ko same naam wale original project paths par copy/replace karo. Root ki `package.json`, `package-lock.json` aur `.env.example` bhi replace karo.

## 3. Nodemailer dependency install karo

Original DriveMart project folder mein VS Code terminal kholo aur run karo:

```powershell
npm install nodemailer
```

Ye `package-lock.json` ko bhi update karega. Phir run karo:

```powershell
npm test
npm run check
```

## 4. Vercel Environment Variables add karo

Vercel Dashboard > DriveMart > Settings > Environment Variables mein ye variables **Production** ke liye add karo:

| Variable | Value |
|---|---|
| `GMAIL_USER` | Aapka full Gmail address, e.g. `yourname@gmail.com` |
| `GMAIL_APP_PASSWORD` | Google se generate kiya hua 16-character App Password |
| `GMAIL_FROM_NAME` | `DriveMart` |
| `EMAIL_OTP_SECRET` | Ek alag, strong random secret |
| `PUBLIC_BASE_URL` | `https://drivemart-iota.vercel.app` |
| `REQUIRE_EMAIL_VERIFICATION` | Pehle `false` rakho; real email test ke baad `true` karna |

Optional: `GMAIL_FROM_EMAIL` blank chhor sakte ho. Default sender `GMAIL_USER` hoga.

`EMAIL_OTP_SECRET` ke liye Windows PowerShell mein ye command chala sakte ho:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output ko `EMAIL_OTP_SECRET` mein paste karo. Is secret ko public mat karna.

## 5. GitHub push aur Vercel redeploy

```powershell
git add .
git commit -m "Use Gmail SMTP for DriveMart email verification and recovery"
git push
```

Agar aapki GitHub branch Vercel Production se connected hai to push ke baad Vercel deploy karega. Deployments mein status `Ready` check karo.

## 6. Email test

1. `/forgot-password` se apne test user ke email par reset link bhejo.
2. `/reset-password-otp` flow se OTP test karo.
3. Login ke baad `/verify-email` par verification code send karo.
4. Jab real email delivery successful ho, tab `REQUIRE_EMAIL_VERIFICATION=true` set kar sakte ho aur redeploy karo.

## Security notes

- Normal Gmail password, App Password ya OTP ChatGPT/chat, GitHub code, screenshots, ya public files mein share mat karo.
- Credentials sirf Vercel Environment Variables mein rakho.
- Gmail App Password ko Google Account se kabhi bhi revoke kar sakte ho.
- Personal Gmail SMTP ke sending limits hotay hain; FYP testing / low-volume transactional emails ke liye use karo, bulk marketing ke liye nahi.
- Code Gmail SMTP `smtp.gmail.com:465` (TLS) use karta hai.

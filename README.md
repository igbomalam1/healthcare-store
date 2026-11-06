# Healthcare Store - CapsaCare™ Neuropathy Relief Campaign

High-converting Nigerian e-commerce direct response landing page for **CapsaCare™ Neuropathy Relief Cream**, customized for **Healthcare Store**.

---

## 📌 Configured Store Credentials & Contacts

- **Store Name:** `Healthcare Store`
- **Call / WhatsApp Phone:** `+234 704 527 0376` (`0704 527 0376`)
- **Recipient Email for Orders:** `udodirithonia@gmail.com`
- **Email Delivery Service:** Resend API

---

## 🚀 How to Run Locally

You only need Node.js installed (no package installations or build steps required):

```bash
cd healthcare-store
node server.js
```

Then open your browser at:
👉 **`http://localhost:3000`**

---

## 🔑 Activating Resend Email Delivery

When you are ready with your Resend API Key:

1. Open `.env.local` inside the `healthcare-store` folder.
2. Replace `RESEND_API_KEY=` with your key:
   ```env
   RESEND_API_KEY=re_123456789abcdef
   MERCHANT_EMAIL=udodirithonia@gmail.com
   FROM_EMAIL=Healthcare Store <onboarding@resend.dev>
   ```
3. Restart `node server.js`.

*Note: For production, verify your domain in Resend and update `FROM_EMAIL` (e.g. `orders@healthcaresotre.com.ng`). In development or testing, `onboarding@resend.dev` delivers directly to your verified email.*

---

## 📦 What the Customer & Merchant Receive

1. **Merchant Email (`udodirithonia@gmail.com`)**:
   - Order Reference ID (e.g. `#HCS-847291`)
   - Customer Full Name
   - Primary Phone Number (clickable `tel:` link)
   - WhatsApp Number (clickable `wa.me` direct link)
   - Customer Email
   - Selected Package & Exact Naira Amount to collect
   - Complete Delivery Address & State
   - Customer notes / delivery landmarks
   - One-click "Chat Customer on WhatsApp" button

2. **Customer Email Confirmation** (if email is provided):
   - Professional order receipt with Order ID
   - Summary of selected package & amount due on delivery
   - Clear delivery expectation ("Rider will call before arriving")
   - Support phone & WhatsApp contacts

3. **Instant Post-Submit WhatsApp Redirection**:
   - Customers get an immediate on-screen button to ping her on WhatsApp with their Order ID pre-filled for express dispatch confirmation.

---

## 🌐 Deploying to Production

This project can be deployed anywhere:
- **Vercel / Netlify**: Deploy as a static site or Node.js server.
- **Render / Railway / VPS**: Run `node server.js` with `RESEND_API_KEY` set in environment variables.
- **cPanel / Apache / PHP Hosting**: The `index.html` file and `images/` directory can be uploaded directly to `public_html`.

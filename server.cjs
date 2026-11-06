/**
 * Zero-dependency Node server for Healthcare Store
 * - Serves static files (HTML, CSS, images)
 * - Handles POST /api/order
 * - Dispatches emails via Resend API using native Node fetch
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const MERCHANT_EMAIL = process.env.MERCHANT_EMAIL || 'udodirithonia@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'HEALTHCARE STORE <sales@healthcarestore.com.ng>';
const DEFAULT_KEY = process.env.RESEND_API_KEY;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

async function sendResendEmail(apiKey, to, subject, html) {
  const activeKey = apiKey || DEFAULT_KEY;
  if (!activeKey) {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    return { id: 'mock_' + Date.now() };
  }

  let res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${activeKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Resend-Node/4.0.0'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  let data = await res.json();
  // Auto-fallback if custom domain is not yet verified in Resend DNS
  if (!res.ok && data && data.message && data.message.includes('domain is not verified')) {
    console.warn(`[Resend Notice] Domain ${FROM_EMAIL} is not yet verified on resend.com/domains. Sending via onboarding@resend.dev to ensure delivery to ${to}`);
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Resend-Node/4.0.0'
      },
      body: JSON.stringify({
        from: 'Healthcare Store <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject: `[Order Alert] ${subject}`,
        html: `<div style="padding:10px;background:#fef3c7;color:#92400e;margin-bottom:12px;font-size:12px;border-radius:6px;">⚠️ Note: Sent via onboarding@resend.dev while sales@healthcarestore.com.ng domain DNS finishes verification on Resend.</div>` + html,
      }),
    });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.message || `Resend Error: ${res.statusText}`);
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle Order API
  if (pathname === '/api/order' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const { fullName, phone, whatsapp, email, address, state, packageSelected, price, notes } = body;

        if (!fullName || !phone || !address || !state || !packageSelected) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required order details.' }));
          return;
        }

        const orderId = `HCS-${Date.now().toString().slice(-6)}`;
        const orderDate = new Date().toLocaleString('en-NG', {
          timeZone: 'Africa/Lagos',
          dateStyle: 'full',
          timeStyle: 'short',
        });

        const apiKey = process.env.RESEND_API_KEY;

        // 1. Merchant Notification Email HTML
        const merchantHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background: #158A5E; padding: 24px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎉 NEW ORDER RECEIVED!</h1>
              <p style="margin: 6px 0 0; opacity: 0.9; font-size: 15px;">Order ID: <strong>#${orderId}</strong> | ${orderDate}</p>
            </div>
            
            <div style="padding: 24px; color: #1f2937;">
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: bold;">ORDER SUMMARY</p>
                <h2 style="margin: 4px 0 0; font-size: 20px; color: #047857;">${packageSelected}</h2>
                <p style="margin: 6px 0 0; font-size: 18px; font-weight: bold; color: #111827;">Amount to Collect: <span style="color: #dc2626;">₦${price || 'POD'}</span></p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #4b5563;">Payment Method: <strong>Pay On Delivery (Cash or Bank Transfer)</strong></p>
              </div>

              <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; font-size: 16px; color: #111827;">CUSTOMER INFORMATION</h3>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                <tbody>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 35%;">Customer Name:</td>
                    <td style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #111827;">${fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone Number:</td>
                    <td style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #111827;">
                      <a href="tel:${phone}" style="color: #158A5E; text-decoration: none;">${phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">WhatsApp Number:</td>
                    <td style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #111827;">
                      <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" style="color: #158A5E; text-decoration: none;">${whatsapp || phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer Email:</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827;">${email || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Delivery State:</td>
                    <td style="padding: 8px 0; font-weight: bold; font-size: 15px; color: #111827;">${state}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Delivery Address:</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827; line-height: 1.4;">${address}</td>
                  </tr>
                  ${notes ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Notes:</td><td style="padding: 8px 0; font-size: 14px; color: #111827;">${notes}</td></tr>` : ''}
                </tbody>
              </table>

              <div style="margin-top: 30px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${fullName}, this is Healthcare Store regarding your order #${orderId} for CapsaCare. We are preparing your shipment.`)}" 
                   style="background: #158A5E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
                  Chat Customer on WhatsApp
                </a>
              </div>
            </div>
          </div>
        `;

        // 2. Customer Confirmation Email HTML
        const customerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background: #158A5E; padding: 24px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 22px;">Healthcare Store</h1>
              <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Order Confirmation #${orderId}</p>
            </div>
            
            <div style="padding: 24px; color: #1f2937;">
              <p style="font-size: 16px; margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
              <p style="color: #4b5563; line-height: 1.5; font-size: 14px;">
                Thank you for ordering <strong>CapsaCare™ Neuropathy Relief Cream</strong> from <strong>Healthcare Store</strong>. Your order is received and our dispatch logistics team is currently processing it!
              </p>

              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-weight: bold; font-size: 15px; color: #111827;">Your Selected Package:</p>
                <p style="margin: 0; font-size: 16px; color: #158A5E; font-weight: bold;">${packageSelected}</p>
                <p style="margin: 8px 0 0; font-size: 15px; color: #111827;">Total to pay at delivery: <span style="font-weight: bold; color: #dc2626;">₦${price}</span></p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Payment Method: <strong>Pay On Delivery (Cash / Transfer to Rider)</strong></p>
              </div>

              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: bold;">🚚 WHAT HAPPENS NEXT?</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #1e3a8a; line-height: 1.4;">
                  1. Our representative or dispatch officer will call/WhatsApp you on <strong>${phone}</strong> within a few hours to confirm your availability.<br/>
                  2. Your package will be delivered directly to <strong>${address}, ${state}</strong>.<br/>
                  3. You inspect your sealed CapsaCare™ package upon arrival and pay the delivery rider.
                </p>
              </div>

              <p style="font-size: 14px; color: #4b5563;">
                If you need immediate assistance or want to update your delivery address, please reach out to us:
              </p>
              <p style="margin: 4px 0; font-size: 14px;">
                📞 <strong>Call / WhatsApp:</strong> <a href="https://wa.me/2347045270376" style="color: #158A5E; font-weight: bold; text-decoration: none;">+234 704 527 0376</a><br/>
                ✉️ <strong>Email:</strong> udodirithonia@gmail.com
              </p>

              <p style="margin-top: 24px; font-size: 14px; color: #111827;">
                Warm regards,<br/>
                <strong>Healthcare Store Support Team</strong>
              </p>
            </div>
          </div>
        `;

        let emailSentToMerchant = false;
        let emailSentToCustomer = false;
        let resendError = null;

        try {
          // Send to merchant
          await sendResendEmail(
            apiKey,
            MERCHANT_EMAIL,
            `🚨 [NEW ORDER #${orderId}] ${fullName} - ₦${price || 'POD'} - ${packageSelected}`,
            merchantHtml
          );
          emailSentToMerchant = true;

          // Send to customer if provided
          if (email && email.includes('@')) {
            await sendResendEmail(
              apiKey,
              email.trim(),
              `Order Confirmation: CapsaCare™ Neuropathy Cream (Order #${orderId})`,
              customerHtml
            );
            emailSentToCustomer = true;
          }
        } catch (err) {
          console.error('[Resend Error]', err.message);
          resendError = err.message;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          orderId,
          emailSentToMerchant,
          emailSentToCustomer,
          resendError,
          message: 'Order received successfully!'
        }));
      } catch (err) {
        console.error('Server order processing error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error processing order' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = pathname === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, pathname);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    // Check if in public/
    const publicPath = path.join(__dirname, 'public', pathname);
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 HEALTHCARE STORE IS LIVE!`);
  console.log(`👉 URL: http://localhost:${PORT}`);
  console.log(`📧 Merchant Orders Email: ${MERCHANT_EMAIL}`);
  console.log(`📞 Support Phone / WhatsApp: +234 704 527 0376`);
  console.log(`===================================================`);
});

/**
 * VERCEL SERVERLESS FUNCTION: /api/order
 * Deployable directly on Vercel with zero extra server configuration.
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      fullName,
      phone,
      whatsapp,
      email,
      address,
      state,
      packageSelected,
      price,
      notes,
    } = body;

    if (!fullName || !phone || !address || !state || !packageSelected) {
      return res.status(400).json({
        error: 'Missing required order details (Name, Phone, Address, State, Package).',
      });
    }

    const orderId = `HCS-${Date.now().toString().slice(-6)}`;
    const orderDate = new Date().toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const apiKey = process.env.RESEND_API_KEY;
    const merchantEmail = process.env.MERCHANT_EMAIL || 'udodirithonia@gmail.com';
    const primaryFrom = process.env.FROM_EMAIL || 'HEALTHCARE STORE <sales@healthcarestore.com.ng>';
    const verifiedFallbackFrom = 'Healthcare Store <orders@buyget.com.ng>';

    // 1. Merchant Notification HTML
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
                  <a href="https://wa.me/${String(whatsapp || phone).replace(/\D/g, '')}" style="color: #158A5E; text-decoration: none;">${whatsapp || phone}</a>
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
              ${notes ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Notes / Landmark:</td><td style="padding: 8px 0; font-size: 14px; color: #111827;">${notes}</td></tr>` : ''}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
            <a href="https://wa.me/${String(whatsapp || phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${fullName}, this is Healthcare Store regarding your order #${orderId} for CapsaCare. We are preparing your shipment.`)}" 
               style="background: #158A5E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
              Chat Customer on WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;

    // 2. Customer Confirmation HTML
    const customerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #158A5E; padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">Healthcare Store</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Order Confirmation #${orderId}</p>
        </div>
        
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
          <p style="color: #4b5563; line-height: 1.5; font-size: 14px;">
            Thank you for ordering <strong>CapsaCare™ Neuropathy Relief Cream</strong> from <strong>Healthcare Store</strong>. Your order has been received and our dispatch logistics team is currently processing it!
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

    // Resilient sender function with auto-fallback to verified domain
    async function sendEmailWithFallback(toAddr, subject, html) {
      // 1. Try sending with the configured primary sender
      let response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Resend-Node/4.0.0',
        },
        body: JSON.stringify({
          from: primaryFrom,
          reply_to: 'udodirithonia@gmail.com',
          to: Array.isArray(toAddr) ? toAddr : [toAddr],
          subject,
          html,
        }),
      });

      let data = await response.json();

      // 2. If primary domain (healthcarestore.com.ng) is unverified or rejected, fallback to verified domain
      if (!response.ok) {
        console.warn(`[Resend Notice] Primary sender ${primaryFrom} rejected (${data?.message}). Retrying with verified domain ${verifiedFallbackFrom}...`);
        
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Resend-Node/4.0.0',
          },
          body: JSON.stringify({
            from: verifiedFallbackFrom,
            reply_to: 'udodirithonia@gmail.com',
            to: Array.isArray(toAddr) ? toAddr : [toAddr],
            subject,
            html,
          }),
        });

        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to dispatch email via Resend');
      }
      return data;
    }

    let emailSentToMerchant = false;
    let emailSentToCustomer = false;
    let merchantError = null;
    let customerError = null;

    // Send to Merchant (Thonia)
    try {
      const resM = await sendEmailWithFallback(
        merchantEmail,
        `🚨 [NEW ORDER #${orderId}] ${fullName} - ₦${price || 'POD'} - ${packageSelected}`,
        merchantHtml
      );
      if (resM?.id) emailSentToMerchant = true;
    } catch (err) {
      console.error('[Merchant Email Error]', err.message);
      merchantError = err.message;
    }

    // Send to Customer if valid email provided
    if (email && email.includes('@')) {
      try {
        const resC = await sendEmailWithFallback(
          email.trim(),
          `Order Confirmation: CapsaCare™ Neuropathy Cream (Order #${orderId})`,
          customerHtml
        );
        if (resC?.id) emailSentToCustomer = true;
      } catch (err) {
        console.error('[Customer Email Error]', err.message);
        customerError = err.message;
      }
    }

    return res.status(200).json({
      success: true,
      orderId,
      emailSentToMerchant,
      emailSentToCustomer,
      merchantError,
      customerError,
      message: 'Order received successfully! Our dispatch officer will call you shortly to confirm delivery.',
    });
  } catch (error) {
    console.error('Serverless order processing error:', error);
    return res.status(500).json({ error: 'Server error processing order' });
  }
}

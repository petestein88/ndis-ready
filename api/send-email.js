// =============================================================
// NDIS Ready — Email Sender
// POST /api/send-email
// Handles all transactional emails via Resend
// =============================================================

const { applyCors, isInternalCall } = require('./_lib/security');

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Transactional emails are only ever triggered by our own server-side code
  // (webhook, generate-documents). Require the internal secret so the public
  // can't use this endpoint to send arbitrary emails from our domain.
  if (!isInternalCall(req)) {
    console.warn('Blocked unauthorised send-email attempt');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type, email, name, data } = req.body;

  if (!type || !email) {
    return res.status(400).json({ error: 'Missing required fields: type, email' });
  }

  let subject, html;

  switch (type) {

    case 'document_delivery': {
      const { orgName, docCount, downloadUrl, productTier, expiresAt } = data;
      const tierLabel = productTier === 'value_bundle'
        ? 'Value Bundle (Registration Kit + Stay Ready)'
        : productTier === 'free_sample'
        ? 'Free Compliance Sample'
        : 'Registration Kit';

      subject = `Your NDIS compliance documents are ready`;
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f7f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#01696f;padding:32px 40px;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">NDIS Ready</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Compliance made simple for NDIS providers</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 8px;color:#28251d;font-size:22px;">Your documents are ready, ${name || orgName || 'there'}!</h2>
    <p style="color:#7a7974;font-size:15px;line-height:1.6;margin:0 0 24px;">Your <strong>${tierLabel}</strong> is complete. You have <strong>${docCount} compliance documents</strong> personalised for <strong>${orgName || 'your organisation'}</strong> ready to download.</p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
    <tr><td style="background:#01696f;border-radius:8px;">
      <a href="${downloadUrl}" style="display:inline-block;padding:16px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">Download My ${docCount} Documents &rarr;</a>
    </td></tr></table>

    <p style="color:#7a7974;font-size:13px;margin:0 0 32px;">This link expires in 7 days (${new Date(expiresAt).toLocaleDateString('en-AU')}).</p>

    <div style="background:#f7f6f2;border-radius:8px;padding:24px;margin-bottom:32px;">
      <h3 style="margin:0 0 16px;color:#28251d;font-size:16px;">What's included:</h3>
      <ul style="margin:0;padding:0 0 0 20px;color:#28251d;font-size:14px;line-height:2;">
        <li>All documents pre-populated with your organisation's details</li>
        <li>Structured to meet NDIS Practice Standards 2021 Quality Indicators</li>
        <li>Governance, HR, Safety, Incidents, Safeguarding + SIL-specific docs</li>
        <li>Review dates, version control, and document owner fields completed</li>
        <li>Ready to submit to your NDIS auditor</li>
      </ul>
    </div>

    <h3 style="margin:0 0 12px;color:#28251d;font-size:16px;">Your next steps:</h3>
    <ol style="margin:0 0 32px;padding:0 0 0 20px;color:#28251d;font-size:14px;line-height:2.2;">
      <li>Download your document bundle using the button above</li>
      <li>Add your ABN and any remaining organisation-specific details</li>
      <li>Have a director sign the key governance documents</li>
      <li>Upload to your NDIS provider portal when applying for registration</li>
    </ol>

    <p style="color:#7a7974;font-size:13px;border-top:1px solid #dcd9d5;padding-top:24px;margin:0;">Questions? Reply to this email or contact <a href="mailto:hello@ndis-ready.com.au" style="color:#01696f;">hello@ndis-ready.com.au</a></p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f7f6f2;padding:24px 40px;border-top:1px solid #dcd9d5;">
    <p style="margin:0;color:#7a7974;font-size:12px;text-align:center;">NDIS Ready | <a href="https://ndis-ready.com.au" style="color:#01696f;">ndis-ready.com.au</a> | <a href="https://ndis-ready.com.au/privacy.html" style="color:#01696f;">Privacy Policy</a></p>
    <p style="margin:4px 0 0;color:#bab9b4;font-size:11px;text-align:center;">Sent to ${email} following your NDIS Ready purchase.</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
      break;
    }

    case 'payment_failed': {
      const { retryUrl } = data;
      subject = 'Your NDIS Ready payment was unsuccessful';
      html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#f7f6f2;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
  <h2 style="color:#28251d;">Payment unsuccessful</h2>
  <p style="color:#7a7974;">Hi ${name || 'there'},</p>
  <p style="color:#7a7974;">Unfortunately your payment for NDIS Ready could not be processed. This can happen due to insufficient funds, an expired card, or a temporary issue with your bank.</p>
  <p><a href="${retryUrl}" style="background:#01696f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">Try Again &rarr;</a></p>
  <p style="color:#bab9b4;font-size:12px;margin-top:32px;">Questions? Email <a href="mailto:hello@ndis-ready.com.au" style="color:#01696f;">hello@ndis-ready.com.au</a></p>
</div></body></html>`;
      break;
    }

    case 'internal_alert': {
      // Operational alert to the team (e.g. a paid order needs manual fulfilment).
      const alert = data || {};
      subject = alert.subject || 'NDIS Ready internal alert';
      const safeMessage = String(alert.message || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#f7f6f2;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
  <h2 style="color:#964219;margin-top:0;">${subject}</h2>
  <pre style="white-space:pre-wrap;color:#28251d;font-family:sans-serif;font-size:14px;line-height:1.5;">${safeMessage}</pre>
</div></body></html>`;
      break;
    }

    default:
      return res.status(400).json({ error: `Unknown email type: ${type}` });
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'NDIS Ready <hello@ndis-ready.com.au>',
        to:      [email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return res.status(500).json({ error: 'Email send failed', details: resendData });
    }

    console.log(`Email sent [${type}] to ${email} — Resend ID: ${resendData.id}`);
    return res.status(200).json({ success: true, emailId: resendData.id });

  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message });
  }
};

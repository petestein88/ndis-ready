// =============================================================
// NDIS Ready — Public contact / suggestions endpoint
//   Receives messages from the site-wide "We're here to help" modal
//   and emails them to hello@ndis-ready.com.au via Resend.
//   Public, browser-facing: CORS-restricted, with honeypot + length
//   caps for basic spam protection. No internal secret required.
// =============================================================
const { applyCors } = require('./_lib/security');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name = '', email = '', message = '', page = '', company = '' } = req.body || {};

    // Honeypot: bots fill the hidden "company" field. Silently accept + drop.
    if (company && company.trim()) {
      return res.status(200).json({ success: true });
    }

    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) {
      return res.status(400).json({ error: 'Please include a message.' });
    }
    if (cleanMsg.length > 4000) {
      return res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
    }

    const cleanName  = String(name || '').trim().substring(0, 120);
    const cleanEmail = String(email || '').trim().substring(0, 200);
    const cleanPage  = String(page || '').trim().substring(0, 200);
    const validEmail = cleanEmail && cleanEmail.includes('@') && cleanEmail.includes('.');

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('contact: RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Messaging is temporarily unavailable. Please email hello@ndis-ready.com.au directly.' });
    }

    // ── Email the message to the team ─────────────────────────────────────
    const emailBody = {
      from:    'NDIS Ready <hello@ndis-ready.com.au>',
      to:      ['hello@ndis-ready.com.au'],
      subject: `New message from the site${cleanName ? ` — ${cleanName}` : ''}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#2a2535;margin:0 0 16px;">New message via the site contact form</h2>
          <p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(cleanName) || '<em>(not given)</em>'}</p>
          <p style="margin:4px 0;"><strong>Email:</strong> ${validEmail ? escapeHtml(cleanEmail) : '<em>(not given / invalid)</em>'}</p>
          <p style="margin:4px 0;"><strong>From page:</strong> ${escapeHtml(cleanPage) || '<em>(unknown)</em>'}</p>
          <hr style="border:none;border-top:1px solid #e2ddd3;margin:16px 0;"/>
          <p style="white-space:pre-wrap;line-height:1.6;color:#2a2535;">${escapeHtml(cleanMsg)}</p>
        </div>`,
    };
    if (validEmail) emailBody.reply_to = cleanEmail;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body:    JSON.stringify(emailBody),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => '');
      console.error('contact: Resend send failed:', emailRes.status, errText);
      return res.status(502).json({ error: 'Could not send right now. Please email hello@ndis-ready.com.au directly.' });
    }

    // ── Best-effort log to Supabase (non-blocking, never fails the request) ─
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/leads`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          email:      validEmail ? cleanEmail.toLowerCase() : 'no-email@contact-form.local',
          org_name:   cleanName || 'Contact form',
          source:     'contact',
          quiz_answers: { message: cleanMsg, page: cleanPage, name: cleanName },
          created_at: new Date().toISOString(),
        }),
      }).catch(err => console.error('contact: supabase log failed (non-fatal):', err.message));
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('contact error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please email hello@ndis-ready.com.au directly.' });
  }
};

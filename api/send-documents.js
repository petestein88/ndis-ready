/**
 * POST /api/send-documents
 *
 * Fetches the 3 free sample .docx files from Supabase Storage
 * using signed URLs (consistent with generate-documents.js),
 * encodes them as base64, and sends as email attachments via Resend.
 *
 * Expected body: { email, org_name }
 *
 * Called internally by capture-email.js (fire-and-forget)
 * and can also be called directly (e.g. retry flow).
 */

const { createClient } = require('@supabase/supabase-js');

const DOCS = [
  {
    filename: 'Incident-Management-Policy-GOV-IMP-001.docx',
    storage_path: 'free-samples/incident-management-policy.docx',
  },
  {
    filename: 'Complaints-Management-Policy-GOV-CMP-002.docx',
    storage_path: 'free-samples/complaints-management-policy.docx',
  },
  {
    filename: 'Risk-Management-Framework-GOV-RMF-003.docx',
    storage_path: 'free-samples/risk-management-framework.docx',
  },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, org_name } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const resendKey    = process.env.RESEND_API_KEY;
  const cleanOrgName = (org_name || 'Your Organisation').trim().substring(0, 200);

  try {
    // ── 1. Generate signed URLs and fetch each doc from Supabase Storage ──
    const attachments = [];

    for (const doc of DOCS) {
      const { data: signedData, error: signError } = await supabase.storage
        .from('templates')
        .createSignedUrl(doc.storage_path, 60);

      if (signError || !signedData?.signedUrl) {
        console.error(`Failed to sign URL for ${doc.storage_path}:`, signError?.message);
        throw new Error(`Storage sign failed for ${doc.filename}`);
      }

      const fileRes = await fetch(signedData.signedUrl);

      if (!fileRes.ok) {
        console.error(`Failed to fetch ${doc.storage_path}: ${fileRes.status} ${fileRes.statusText}`);
        throw new Error(`Storage fetch failed for ${doc.filename}`);
      }

      const arrayBuffer = await fileRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      attachments.push({
        filename: doc.filename,
        content:  base64,
      });
    }

    // ── 2. Send email with attachments via Resend ──────────────────────────
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:        'NDIS Ready <hello@ndis-ready.com.au>',
        to:          [email],
        subject:     'Your 3 free NDIS compliance documents — ready to use',
        attachments,
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#2a2535;">
  <h2 style="color:#016970;margin-bottom:8px;">Your free compliance documents are here</h2>
  <p style="color:#555;">Hi ${cleanOrgName},</p>
  <p>As promised — your 3 free NDIS compliance document templates are attached to this email, ready to customise with your organisation's details.</p>

  <div style="background:#f0f9f8;border:1px solid #b2d8d8;border-radius:10px;padding:20px 24px;margin:24px 0;">
    <strong style="color:#016970;">Attached documents:</strong>
    <ul style="margin:12px 0 0 0;padding-left:20px;line-height:2;">
      <li>Incident Management Policy &amp; Procedure (GOV-IMP-001)</li>
      <li>Complaints Management &amp; Resolution Policy (GOV-CMP-002)</li>
      <li>Risk Management Framework (GOV-RMF-003)</li>
    </ul>
  </div>

  <p>Each document uses <strong>[ORGANISATION NAME]</strong> style placeholders — simply do a Find &amp; Replace in Word to add your organisation name, dates, and contact details.</p>

  <p><strong>These 3 documents alone could take weeks to write from scratch.</strong> If you need all the documents identified in your compliance profile, our full kit has everything pre-written and ready to go.</p>

  <a href="https://ndis-ready.com.au/#pricing" style="display:inline-block;background:#016970;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;margin:8px 0 24px;">Unlock your full document kit &rarr;</a>

  <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:20px;margin-top:8px;">
    NDIS Ready &mdash; hello@ndis-ready.com.au &mdash; ndis-ready.com.au<br/>
    To unsubscribe reply with "unsubscribe" in the subject line.
  </p>
</div>`,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend attachment email error:', errText);
      return res.status(500).json({ error: 'Failed to send document email', detail: errText });
    }

    // ── 3. Log delivery to document_downloads (aligned to live schema) ─────
    await supabase.from('document_downloads').insert({
      customer_email: email,          // live col: customer_email (not email)
      documents:      DOCS.map(d => d.filename),
      tier:           'free_sample',
      created_at:     new Date().toISOString(),
    }).catch(err => console.warn('document_downloads log failed (non-fatal):', err.message));

    return res.status(200).json({ success: true, sent: DOCS.length });

  } catch (err) {
    console.error('send-documents error:', err);
    return res.status(500).json({ error: 'Document delivery failed', detail: err.message });
  }
};

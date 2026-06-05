const { createClient } = require('@supabase/supabase-js');

// The 3 free sample docs delivered as attachments with the confirmation email.
const FREE_DOCS = [
  { filename: 'Incident-Management-Policy-GOV-IMP-001.docx',     storage_path: 'free-samples/incident-management-policy.docx' },
  { filename: 'Complaints-Management-Policy-GOV-CMP-002.docx',   storage_path: 'free-samples/complaints-management-policy.docx' },
  { filename: 'Risk-Management-Framework-GOV-RMF-003.docx',      storage_path: 'free-samples/risk-management-framework.docx' },
];

// Fetch the 3 free docs from Supabase Storage and return base64 attachments.
async function buildFreeDocAttachments(supabaseUrl, supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const attachments = [];
  for (const doc of FREE_DOCS) {
    const { data: signedData, error: signError } = await supabase.storage
      .from('templates')
      .createSignedUrl(doc.storage_path, 120);
    if (signError || !signedData?.signedUrl) {
      throw new Error(`Storage sign failed for ${doc.filename}: ${signError?.message}`);
    }
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      throw new Error(`Storage fetch failed for ${doc.filename}: ${fileRes.status}`);
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    attachments.push({
      filename: doc.filename,
      content:  Buffer.from(arrayBuffer).toString('base64'),
    });
  }
  return attachments;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, answers, services, org_name } = req.body;

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const cleanEmail   = email.toLowerCase().trim();
    const cleanOrgName = (org_name || 'Your Organisation').trim().substring(0, 200);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const resendKey   = process.env.RESEND_API_KEY;

    // ── 1. Upsert lead to Supabase (prevent duplicates) ───────────────────
    // If email already exists: update quiz_answers and org_name, do NOT
    // re-send free documents (already_exists flag prevents duplicate delivery).
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/leads?email=eq.${encodeURIComponent(cleanEmail)}&select=id,created_at`,
      {
        headers: {
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const existingRows = existingRes.ok ? await existingRes.json() : [];
    const alreadyExists = Array.isArray(existingRows) && existingRows.length > 0;

    if (alreadyExists) {
      // Update existing lead with latest quiz answers
      await fetch(
        `${supabaseUrl}/rest/v1/leads?email=eq.${encodeURIComponent(cleanEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({
            org_name:     cleanOrgName,
            quiz_answers: answers || {},
            services:     services || [],
          }),
        }
      );
    } else {
      // Insert new lead
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({
          email:        cleanEmail,
          org_name:     cleanOrgName,
          quiz_answers: answers || {},
          services:     services || [],
          source:       'quiz',
          created_at:   new Date().toISOString(),
        }),
      });

      if (!dbResponse.ok) {
        const dbError = await dbResponse.text();
        console.error('Supabase insert error:', dbError);
      }
    }

    // ── 2. Calculate compliance profile ───────────────────────────────────
    const docCount     = calcDocCount(answers || {}, services || []);
    const profileLabel = buildProfileLabel(answers || {});

    // ── 3. Send confirmation email WITH the 3 free docs attached ───────────
    // Build attachments first so the docs ship inside this single email.
    // If storage fetch fails we still send the confirmation (without files)
    // and fall back to the standalone send-documents endpoint in step 5.
    let freeDocAttachments = [];
    let attachmentsReady   = false;
    try {
      freeDocAttachments = await buildFreeDocAttachments(supabaseUrl, supabaseKey);
      attachmentsReady   = freeDocAttachments.length === FREE_DOCS.length;
    } catch (attachErr) {
      console.error('Free-doc attachment build failed (will fall back):', attachErr.message);
    }

    const docsBlock = attachmentsReady
      ? `<div style="background:#f0f9f8;border:1px solid #b2d8d8;border-radius:10px;padding:20px 24px;margin:24px 0;">
            <strong style="color:#016970;">Your 3 free sample documents are attached to this email.</strong>
            <ul style="margin:12px 0 0 0;padding-left:20px;line-height:2;">
              <li>Incident Management Policy &amp; Procedure</li>
              <li>Complaints Management Policy &amp; Procedure</li>
              <li>Risk Management Framework</li>
            </ul>
          </div>
          <p>Each document is pre-written to NDIS Practice Standards. Open the attachments and use Find &amp; Replace in Word to drop in your organisation's details.</p>`
      : `<div style="background:#f0f9f8;border:1px solid #b2d8d8;border-radius:10px;padding:20px 24px;margin:24px 0;">
            <strong style="color:#016970;">Your 3 free sample documents are on their way.</strong><br/><br/>
            They'll arrive in a separate email in the next few minutes:<br/><br/>
            &bull; Incident Management Policy &amp; Procedure<br/>
            &bull; Complaints Management Policy &amp; Procedure<br/>
            &bull; Risk Management Framework
          </div>
          <p>Each document is pre-written to NDIS Practice Standards and ready to customise with your organisation details.</p>`;

    const confirmBody = {
      from:    'NDIS Ready <hello@ndis-ready.com.au>',
      to:      [cleanEmail],
      subject: `Your 3 free NDIS documents + your ${docCount}-document compliance profile`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#016970;">Your compliance profile is ready</h2>
          <p>Based on your answers, you need <strong>${docCount} of the 65 NDIS compliance documents</strong> for your <strong>${profileLabel}</strong> profile.</p>
          ${docsBlock}
          <a href="https://ndis-ready.com.au/#pricing" style="display:inline-block;background:#016970;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Unlock all ${docCount} documents &rarr;</a>
          <p style="color:#999;font-size:12px;margin-top:32px;">NDIS Ready &mdash; hello@ndis-ready.com.au &mdash; ndis-ready.com.au</p>
        </div>`,
    };
    if (attachmentsReady) confirmBody.attachments = freeDocAttachments;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify(confirmBody),
    });

    // ── 4. Internal lead notification ──────────────────────────────────────
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    'NDIS Ready <hello@ndis-ready.com.au>',
        to:      ['hello@ndis-ready.com.au'],
        subject: `${alreadyExists ? '[RETURNING] ' : ''}New lead: ${cleanEmail} (${profileLabel})`,
        html: `<p><strong>${alreadyExists ? 'Returning' : 'New'} quiz lead</strong></p><p>Email: ${cleanEmail}</p><p>Org: ${cleanOrgName}</p><p>Profile: ${profileLabel}</p><p>Docs needed: ${docCount}</p><p>Free docs delivered: ${attachmentsReady ? 'yes (attached to confirmation email)' : 'attachment build failed — fallback endpoint triggered'}</p>`,
      }),
    });

    // ── 5. Fallback delivery ───────────────────────────────────────────────
    // The docs ship as attachments on the confirmation email above (step 3).
    // Only if that attachment build failed do we trigger the standalone
    // send-documents endpoint as a backup. This fires for ALL leads
    // (new AND returning) so a returning user always gets their docs.
    if (!attachmentsReady) {
      const host     = req.headers['x-forwarded-host'] || req.headers['host'] || 'ndis-ready.com.au';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      fetch(`${protocol}://${host}/api/send-documents`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: cleanEmail, org_name: cleanOrgName }),
      }).catch(err => console.error('send-documents fallback trigger failed:', err));
    }

    return res.status(200).json({ success: true, docCount, profileLabel, returning: alreadyExists, docsAttached: attachmentsReady });

  } catch (err) {
    console.error('capture-email error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// IMPORTANT: This MUST stay in lockstep with buildDocList()/calcTotal() in
// results.html so the count the user sees on the results page equals the
// count in this email. Encodings: audit_pathway 0=Certification,1=Verification,
// 2=Not sure. home_visits 0=Yes,1=No. Services: SIL(0), Community(1),
// Personal care(2), Medication(3), Children(4), Coordination(5), Plan mgmt(6),
// Behaviour(7). Set sizes mirror the RULES doc sets (no cross-category id
// overlap, so a flat sum equals the deduped total).
function calcDocCount(answers, services) {
  let count = 18; // core
  const svc = services || [];
  const hasCert = answers.audit_pathway === 0 || [0, 2, 3, 4, 7].some(i => svc.includes(i));
  if (hasCert) count += 14;                       // certification
  if (answers.employees === 1) count += 7;         // hr_small
  else if (answers.employees === 2) count += 11;   // hr_large
  if (answers.home_visits === 0) count += 5;       // home_visits (Yes)
  if (answers.children === 1) count += 4;          // children_some
  else if (answers.children === 2) count += 6;     // children_primary
  if (answers.medication === 1) count += 4;        // medication
  else if (answers.medication === 2) count += 7;   // medication_complex
  return Math.min(count, 65);
}

function buildProfileLabel(answers) {
  const orgLabels = ['Sole Trader', 'Small Team', 'Mid-size Org', 'Large Org'];
  const org   = orgLabels[answers.org_type != null ? answers.org_type : 0];
  const audit = answers.audit_pathway === 0 ? 'Certification' : 'Verification';
  return `${org} — ${audit} Audit`;
}

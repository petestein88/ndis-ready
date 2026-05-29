export default async function handler(req, res) {
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanOrgName = (org_name || 'Your Organisation').trim().substring(0, 200);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        email: cleanEmail,
        org_name: cleanOrgName,
        quiz_answers: answers || {},
        services: services || [],
        source: 'quiz',
        created_at: new Date().toISOString(),
      }),
    });

    if (!dbResponse.ok) {
      const dbError = await dbResponse.text();
      console.error('Supabase error:', dbError);
    }

    const resendKey = process.env.RESEND_API_KEY;
    const docCount = calcDocCount(answers || {}, services || []);
    const profileLabel = buildProfileLabel(answers || {});

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'NDIS Ready <hello@ndis-ready.com.au>',
        to: [cleanEmail],
        subject: `Your ${docCount} NDIS compliance documents — 3 free samples inside`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#2a2535;">Your compliance profile is ready 🎯</h2>
          <p>Based on your answers, you need <strong>${docCount} of the 65 NDIS compliance documents</strong> for your <strong>${profileLabel}</strong> profile.</p>
          <div style="background:#c5ddd0;border-radius:12px;padding:24px;margin:24px 0;">
            <strong>Your 3 free sample documents:</strong><br/><br/>
            ✓ Incident Management Policy &amp; Procedure<br/>
            ✓ Complaints Management Policy &amp; Procedure<br/>
            ✓ Risk Management Framework
          </div>
          <p>These will be sent to you within 24 hours, pre-filled with your organisation details.</p>
          <a href="https://ndis-ready.com.au" style="display:inline-block;background:#2a2535;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Unlock all ${docCount} documents →</a>
          <p style="color:#999;font-size:12px;margin-top:32px;">NDIS Ready · hello@ndis-ready.com.au</p>
        </div>`,
      }),
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'NDIS Ready <hello@ndis-ready.com.au>',
        to: ['hello@ndis-ready.com.au'],
        subject: `🎯 New lead: ${cleanEmail} (${profileLabel})`,
        html: `<p><strong>New quiz lead</strong></p><p>Email: ${cleanEmail}</p><p>Org: ${cleanOrgName}</p><p>Profile: ${profileLabel}</p><p>Docs needed: ${docCount}</p>`,
      }),
    });

    return res.status(200).json({ success: true, docCount, profileLabel });

  } catch (err) {
    console.error('capture-email error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

function calcDocCount(answers, services) {
  let count = 18;
  const hasCert = answers.audit_pathway === 1 || [2,3,4,6,7].some(i => services.includes(i));
  if (hasCert) count += 14;
  if (answers.employees === 1) count += 7;
  if (answers.employees === 2) count += 11;
  if (answers.home_visits === 1) count += 5;
  if (answers.children === 1) count += 4;
  if (answers.children === 2) count += 6;
  if (answers.medication === 1) count += 4;
  if (answers.medication === 2) count += 7;
  return Math.min(count, 65);
}

function buildProfileLabel(answers) {
  const orgLabels = ['Sole Trader', 'Small Team', 'Mid-size Org', 'Large Org'];
  const org = orgLabels[answers.org_type ?? 0];
  const audit = answers.audit_pathway === 1 ? 'Certification' : 'Verification';
  return `${org} · ${audit} Audit`;
}

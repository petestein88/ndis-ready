// =============================================================
// NDIS Ready — Document Generation Pipeline
// POST /api/generate-documents
// Builds signed-URL download manifest, saves to Supabase,
// triggers delivery email via send-email.js
//
// Storage structure:
//   templates/free-samples/   ← 3 free sample docs
//   templates/65 Files/       ← all 65 paid template docs
// =============================================================

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// All 65 documents — filenames match exactly what's in Supabase Storage
// bucket: templates, subfolder: 65 Files/
const DOCUMENT_LIBRARY = [
  // ── Section 1: Participant Rights & Safety ──────────────────────────────
  { id: '1.1', name: '1.1 - Participant Rights Policy',               category: 'rights',      free: false },
  { id: '1.2', name: '1.2 - Complaints and Feedback Policy',          category: 'incidents',   free: true  },
  { id: '1.3', name: '1.3 - Incident Management Policy',              category: 'incidents',   free: true  },
  { id: '1.4', name: '1.4 - Reportable Incidents Procedure',          category: 'incidents',   free: false },
  { id: '1.5', name: '1.5 - Abuse and Neglect Prevention Policy',     category: 'safeguarding',free: false },

  // ── Section 2: Governance ───────────────────────────────────────────────
  { id: '2.1',  name: '2.1 - Governance Framework',                   category: 'governance',  free: false },
  { id: '2.2',  name: '2.2 - Risk Management Policy',                 category: 'governance',  free: true  },
  { id: '2.3',  name: '2.3 - Financial Management Policy',            category: 'governance',  free: false },
  { id: '2.4',  name: '2.4 - Human Resources Policy',                 category: 'hr',          free: false },
  { id: '2.5',  name: '2.5 - Staff Recruitment and Screening Procedure', category: 'hr',       free: false },
  { id: '2.6',  name: '2.6 - Staff Training and Development Policy',  category: 'hr',          free: false },
  { id: '2.7',  name: '2.7 - Performance Management Procedure',       category: 'hr',          free: false },
  { id: '2.8',  name: '2.8 - Whistleblower Policy',                   category: 'governance',  free: false },
  { id: '2.9',  name: '2.9 - Conflict of Interest Policy',            category: 'governance',  free: false },
  { id: '2.10', name: '2.10 - Record Keeping and Privacy Policy',     category: 'governance',  free: false },
  { id: '2.11', name: '2.11 - Information Management Policy',         category: 'governance',  free: false },
  { id: '2.12', name: '2.12 - Business Continuity Plan',              category: 'governance',  free: false },

  // ── Section 3: Service Delivery ─────────────────────────────────────────
  { id: '3.1',  name: '3.1 - Service Delivery Policy',                category: 'support',     free: false },
  { id: '3.2',  name: '3.2 - Intake and Eligibility Procedure',       category: 'support',     free: false },
  { id: '3.3',  name: '3.3 - Support Planning Policy',                category: 'support',     free: false },
  { id: '3.4',  name: '3.4 - Individual Support Plan Template',       category: 'support',     free: false },
  { id: '3.5',  name: '3.5 - Person-Centred Practice Framework',      category: 'support',     free: false },
  { id: '3.6',  name: '3.6 - Consent Policy',                         category: 'rights',      free: false },
  { id: '3.7',  name: '3.7 - Supported Decision Making Policy',       category: 'rights',      free: false },
  { id: '3.8',  name: '3.8 - Transition and Exit Planning Procedure', category: 'support',     free: false },
  { id: '3.9',  name: '3.9 - Cultural Diversity and Inclusion Policy',category: 'rights',      free: false },
  { id: '3.10', name: '3.10 - Restrictive Practices Policy',          category: 'safety',      free: false },
  { id: '3.11', name: '3.11 - Behaviour Support Policy',              category: 'safety',      free: false },
  { id: '3.12', name: '3.12 - Medication Management Policy',          category: 'safety',      free: false },
  { id: '3.13', name: '3.13 - Health and Medical Support Procedure',  category: 'safety',      free: false },
  { id: '3.14', name: '3.14 - Manual Handling Policy',                category: 'safety',      free: false },
  { id: '3.15', name: '3.15 - Emergency and Disaster Management Plan',category: 'safety',      free: false },
  { id: '3.16', name: '3.16 - Mealtime Management Procedure',         category: 'safety',      free: false },

  // ── Section 4: SIL (Supported Independent Living) ───────────────────────
  { id: '4.1', name: '4.1 - SIL Service Agreement Template',          category: 'sil',         free: false },
  { id: '4.2', name: '4.2 - SIL Roster of Care Template',             category: 'sil',         free: false },
  { id: '4.3', name: '4.3 - SIL House Rules Template',                category: 'sil',         free: false },
  { id: '4.4', name: '4.4 - SIL Tenancy Support Policy',              category: 'sil',         free: false },
  { id: '4.5', name: '4.5 - SIL Daily Living Support Procedure',      category: 'sil',         free: false },
  { id: '4.6', name: '4.6 - Overnight and Sleepover Policy',          category: 'sil',         free: false },
  { id: '4.7', name: '4.7 - Household Budget Management Procedure',   category: 'sil',         free: false },
  { id: '4.8', name: '4.8 - Transition to SIL Procedure',             category: 'sil',         free: false },
  { id: '4.9', name: '4.9 - SDA and SIL Coordination Policy',         category: 'sil',         free: false },

  // ── Section 5: Staff & HR ────────────────────────────────────────────────
  { id: '5.1', name: '5.1 - Code of Conduct',                         category: 'hr',          free: false },
  { id: '5.2', name: '5.2 - Staff Handbook',                          category: 'hr',          free: false },
  { id: '5.3', name: '5.3 - Position Description - Support Worker',   category: 'hr',          free: false },
  { id: '5.4', name: '5.4 - Position Description - Team Leader',      category: 'hr',          free: false },
  { id: '5.5', name: '5.5 - Position Description - Service Manager',  category: 'hr',          free: false },
  { id: '5.6', name: '5.6 - Onboarding Checklist',                    category: 'hr',          free: false },
  { id: '5.7', name: '5.7 - Staff NDIS Worker Screening Checklist',   category: 'hr',          free: false },
  { id: '5.8', name: '5.8 - Volunteer Policy',                        category: 'hr',          free: false },
  { id: '5.9', name: '5.9 - Contractor Management Policy',            category: 'hr',          free: false },

  // ── Section 6: Quality & Audit ───────────────────────────────────────────
  { id: '6.1', name: '6.1 - Quality Management Framework',            category: 'quality',     free: false },
  { id: '6.2', name: '6.2 - Internal Audit Schedule',                 category: 'quality',     free: false },
  { id: '6.3', name: '6.3 - Internal Audit Template',                 category: 'quality',     free: false },
  { id: '6.4', name: '6.4 - Continuous Improvement Register',         category: 'quality',     free: false },
  { id: '6.5', name: '6.5 - Corrective Action Procedure',             category: 'quality',     free: false },
  { id: '6.6', name: '6.6 - NDIS Practice Standards Self-Assessment', category: 'quality',     free: false },
  { id: '6.7', name: '6.7 - Audit Preparation Checklist',             category: 'quality',     free: false },

  // ── Section 7: Forms & Registers ────────────────────────────────────────
  { id: '7.1', name: '7.1 - Incident Report Form',                    category: 'incidents',   free: false },
  { id: '7.2', name: '7.2 - Complaints Register',                     category: 'incidents',   free: false },
  { id: '7.3', name: '7.3 - Risk Register',                           category: 'governance',  free: false },
  { id: '7.4', name: '7.4 - Asset Register',                          category: 'governance',  free: false },
  { id: '7.5', name: '7.5 - Training Register',                       category: 'hr',          free: false },
  { id: '7.6', name: '7.6 - Participant Feedback Form',               category: 'incidents',   free: false },
  { id: '7.7', name: '7.7 - Worker Incident Statement Form',          category: 'incidents',   free: false },

  // ── HR & Workforce Template Pack (value_bundle $499 only) ───────────────
  // Practical, fillable SCHADS-aware operational templates — distinct from
  // the HR *policies* above. Stored in templates/HR Pack/. pack:'hr'.
  { id: 'HR.1', name: 'HR.1 - Employment Contract (Permanent)',        category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.2', name: 'HR.2 - Employment Contract (Casual)',           category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.3', name: 'HR.3 - Weekly Roster Template (SCHADS)',        category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.4', name: 'HR.4 - Timesheet and Shift Record',             category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.5', name: 'HR.5 - Leave Request Form',                     category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.6', name: 'HR.6 - Performance Review and Supervision Form', category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.7', name: 'HR.7 - Disciplinary and Warning Letter',        category: 'hr', free: false, pack: 'hr' },
  { id: 'HR.8', name: 'HR.8 - Probation Review Form',                  category: 'hr', free: false, pack: 'hr' },
];

// Free samples live in a separate subfolder
const FREE_SAMPLE_MAP = {
  '1.2': 'free-samples/complaints-management-policy.docx',
  '1.3': 'free-samples/incident-management-policy.docx',
  '2.2': 'free-samples/risk-management-framework.docx',
};

function getStoragePath(doc, productTier) {
  if (productTier === 'free_sample') {
    return FREE_SAMPLE_MAP[doc.id] || null;
  }
  // HR & Workforce Template Pack lives in its own subfolder
  if (doc.pack === 'hr') {
    return `HR Pack/${doc.name}.docx`;
  }
  // Paid docs live in "65 Files/" subfolder
  return `65 Files/${doc.name}.docx`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, email, name, productTier, quizAnswers, orgName, profile } = req.body;

  if (!email || !productTier) {
    return res.status(400).json({ error: 'Missing required fields: email, productTier' });
  }

  console.log(`Generating documents for: ${email} — ${productTier}`);

  try {
    // free_sample → 3 free docs.
    // registration_kit ($249) → all 65 core docs (no HR Pack).
    // value_bundle ($499) → all 65 core docs + HR & Workforce Template Pack.
    let docsToDeliver;
    if (productTier === 'free_sample') {
      docsToDeliver = DOCUMENT_LIBRARY.filter(d => d.free);
    } else if (productTier === 'value_bundle') {
      docsToDeliver = DOCUMENT_LIBRARY;                       // includes pack:'hr'
    } else {
      docsToDeliver = DOCUMENT_LIBRARY.filter(d => d.pack !== 'hr'); // 65 core only
    }

    const variables = await generateVariables({ orgName, name, email, quizAnswers, profile });

    // Persist the full org profile against this lead so the post-payment
    // webhook can re-use it to populate ALL paid docs (not just the free
    // preview). The free preview is the moment we have the richest profile,
    // so we capture it here. Non-fatal if it fails.
    if (profile && Object.keys(profile).length > 0 && email) {
      try {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingLead?.id) {
          await supabase
            .from('leads')
            .update({ profile, org_name: profile.org_name || orgName || null, updated_at: new Date().toISOString() })
            .eq('id', existingLead.id);
        } else {
          await supabase
            .from('leads')
            .insert({
              email,
              org_name:     profile.org_name || orgName || null,
              quiz_answers: quizAnswers || null,
              profile,
              source:       'profile_builder',
              created_at:   new Date().toISOString(),
            });
        }
      } catch (leadErr) {
        console.warn('Could not persist profile to leads (non-fatal):', leadErr.message);
      }
    }

    const downloadManifest = [];
    // Each customer's personalised docs are written under their token folder
    const customerFolder = `${email.replace(/[^a-z0-9]/gi, '_')}/${Date.now()}`;

    for (const doc of docsToDeliver) {
      const storagePath = getStoragePath(doc, productTier);
      if (!storagePath) continue;

      // 1. Download the master template from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('templates')
        .download(storagePath);

      if (dlError || !fileData) {
        console.warn(`Could not download template ${storagePath}:`, dlError && dlError.message);
        continue;
      }

      const templateBuffer = Buffer.from(await fileData.arrayBuffer());

      // 2. Merge {{placeholders}} with this customer's variables
      let outputBuffer;
      try {
        outputBuffer = mergeDocx(templateBuffer, { ...variables, document_title: doc.name });
      } catch (mergeErr) {
        console.warn(`Merge failed for ${doc.name}, delivering raw template:`, mergeErr.message);
        outputBuffer = templateBuffer; // graceful fallback — never break delivery
      }

      // 3. Upload the personalised copy to the private customer-docs bucket
      const outPath = `${customerFolder}/${doc.name}.docx`;
      const { error: upError } = await supabase.storage
        .from('customer-docs')
        .upload(outPath, outputBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });

      if (upError) {
        console.warn(`Could not upload personalised ${outPath}:`, upError.message);
        continue;
      }

      // 4. Sign the personalised copy (7-day link)
      const { data: signedData, error: urlError } = await supabase.storage
        .from('customer-docs')
        .createSignedUrl(outPath, 60 * 60 * 24 * 7);

      if (urlError) {
        console.warn(`Could not sign URL for ${outPath}:`, urlError.message);
        continue;
      }

      downloadManifest.push({
        id:       doc.id,
        name:     doc.name,
        category: doc.category,
        url:      signedData.signedUrl,
      });
    }

    const accessToken = generateAccessToken();
    const expiresAt   = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data: accessRecord, error: accessError } = await supabase
      .from('document_access')
      .insert({
        order_id:     orderId || null,
        email,
        product_tier: productTier,
        access_token: accessToken,
        variables,
        doc_count:    downloadManifest.length,
        manifest:     downloadManifest,
        expires_at:   expiresAt,
        created_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (accessError) {
      console.error('Failed to save document_access:', accessError);
      throw accessError;
    }

    // Log each doc to document_downloads (aligned to live schema)
    const downloadRows = downloadManifest.map(doc => ({
      access_id:      accessRecord.id,
      customer_email: email,
      doc_id:         doc.id,
      doc_title:      doc.name,
      tier:           productTier,
      created_at:     new Date().toISOString(),
    }));

    if (downloadRows.length > 0) {
      try {
        const { error: ddError } = await supabase
          .from('document_downloads')
          .insert(downloadRows);
        if (ddError) console.warn('document_downloads bulk insert failed (non-fatal):', ddError.message);
      } catch (ddErr) {
        console.warn('document_downloads bulk insert threw (non-fatal):', ddErr.message);
      }
    }

    const downloadUrl = `https://ndis-ready.com.au/download.html?token=${accessToken}`;
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://ndis-ready.com.au';

    await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:  'document_delivery',
        email,
        name:  name || orgName || 'there',
        data: {
          orgName:      orgName || name,
          productTier,
          docCount:     downloadManifest.length,
          downloadUrl,
          variables,
          expiresAt,
        },
      }),
    }).catch(err => console.error('send-email trigger failed:', err));

    console.log(`Documents ready: ${downloadManifest.length} docs for ${email}`);

    return res.status(200).json({
      success:     true,
      docCount:    downloadManifest.length,
      downloadUrl,
      manifest:    downloadManifest,   // per-doc signed .docx URLs for instant on-page download
      accessToken,
      expiresAt,
    });

  } catch (err) {
    console.error('generate-documents error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================
// DOCX MERGE — inject {{placeholders}} with customer variables
// Templates use double-brace delimiters: {{org_name}}, {{abn}} ...
// Any placeholder with no matching value is rendered as empty
// (nullGetter) so we never leave raw {{tags}} in the output.
// =============================================================
function mergeDocx(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function generateVariables({ orgName, name, email, quizAnswers, profile }) {
  const today      = new Date();
  const reviewDate = today.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
  const nextReview = new Date(new Date().setFullYear(today.getFullYear() + 1))
    .toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

  const p = profile || {};
  const resolvedOrg = p.org_name || orgName || name || 'Your Organisation';

  // Map every profile field straight onto a template variable.
  // These cover the placeholders injected into the 65 documents.
  const baseVars = {
    // Identity
    org_name:               resolvedOrg,
    trading_name:           p.trading_name || resolvedOrg,
    org_type:               p.org_type || '',
    abn:                    p.abn || '',
    acn:                    p.acn || '',
    phone:                  p.phone || '',
    email:                  p.email || email || '',
    website:                p.website || '',
    street_address:         p.street_address || '',
    suburb:                 p.suburb || '',
    state:                  expandState(p.state) || 'New South Wales',
    postcode:               p.postcode || '',
    full_address:           [p.street_address, p.suburb, p.state, p.postcode].filter(Boolean).join(', '),
    // Key people
    director_name:          p.director_name || name || '',
    director_title:         p.director_title || 'Director',
    service_manager_name:   p.service_manager_name || p.director_name || '',
    compliance_officer_name:p.compliance_officer_name || p.director_name || '',
    safeguarding_officer_name: p.safeguarding_officer_name || '',
    whs_officer_name:       p.whs_officer_name || '',
    document_owner:         p.compliance_officer_name || p.service_manager_name || name || 'Service Manager',
    // Registration
    audit_pathway:          p.audit_pathway || '',
    registration_status:    p.registration_status || '',
    ndis_provider_number:   p.ndis_provider_number || '',
    registration_groups:    p.registration_groups || '',
    support_types:          p.support_types || '',
    // Operations
    staff_count:            p.staff_count || '',
    established_year:        p.established_year || '',
    service_areas:          p.service_areas || '',
    operating_hours:        p.operating_hours || '',
    after_hours_contact:    p.after_hours_contact || '',
    emergency_contact_name: p.emergency_contact_name || '',
    emergency_contact_phone:p.emergency_contact_phone || '',
    insurance_provider:     p.insurance_provider || '',
    insurance_policy_number:p.insurance_policy_number || '',
    // Document control
    review_date:            reviewDate,
    next_review_date:       nextReview,
    version:                '1.0',
    practice_standard_ref:  'NDIS Practice Standards 2021',
    // Narrative blocks (AI-enriched below)
    purpose_statement:      'This policy establishes the framework and obligations required to meet the NDIS Practice Standards.',
    scope_statement:        `This policy applies to all staff, contractors, and volunteers of ${resolvedOrg}.`,
    policy_statement:       'The organisation is committed to delivering safe, high-quality, person-centred supports in accordance with the NDIS Practice Standards and Code of Conduct.',
    procedures:             'All staff must complete mandatory training before commencing support delivery and follow the documented procedures at all times.',
    roles_and_responsibilities: `${p.service_manager_name || 'The Service Manager'}: overall accountability. Team Leaders: day-to-day implementation. Support Workers: adherence to procedures.`,
    related_documents:      'Refer to the complete NDIS Ready Document Library for related policies and forms.',
  };

  // AI enrichment of the narrative blocks using the richest context we have
  const hasContext = (quizAnswers && Object.keys(quizAnswers).length > 0) ||
                     (profile && Object.keys(profile).length > 0);
  if (hasContext) {
    try {
      const prompt = `You are helping an Australian NDIS provider personalise compliance policy documents.

Organisation: ${resolvedOrg}
Organisation type: ${p.org_type || 'unknown'}
Support types delivered: ${p.support_types || 'unknown'}
Approximate staff: ${p.staff_count || 'unknown'}
State: ${baseVars.state}
Audit pathway: ${p.audit_pathway || 'unknown'}
Quiz answers: ${JSON.stringify(quizAnswers || {}, null, 2)}

Provide specific, professional values for these document variables:
- purpose_statement: (1-2 sentences specific to their org type)
- scope_statement: (who the policy applies to, specific to their workforce size)
- policy_statement: (commitment statement tailored to their support types)
- procedures: (key procedural steps relevant to their service type)
- roles_and_responsibilities: (roles specific to their org structure)

Respond ONLY with a valid JSON object with these exact keys. Be professional, specific, and NDIS-compliant.`;

      const completion = await openai.chat.completions.create({
        model:           'gpt-4o-mini',
        messages:        [{ role: 'user', content: prompt }],
        temperature:     0.3,
        response_format: { type: 'json_object' },
      });

      const aiVars = JSON.parse(completion.choices[0].message.content);
      return { ...baseVars, ...aiVars };

    } catch (aiErr) {
      console.warn('OpenAI enrichment failed, using base vars:', aiErr.message);
    }
  }

  return baseVars;
}

function expandState(abbr) {
  const map = {
    ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory',
    QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia',
  };
  if (!abbr) return '';
  return map[String(abbr).toUpperCase()] || abbr;
}

function generateAccessToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

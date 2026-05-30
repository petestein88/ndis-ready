// =============================================================
// NDIS Ready — Document Generation Pipeline
// POST /api/generate-documents
// Uses OpenAI to personalise {{variables}} in all 65 docs
// Saves download manifest to Supabase, triggers delivery email
// =============================================================

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// All 65 document names — matches the .docx filenames in Supabase Storage
const DOCUMENT_LIBRARY = [
  { id: '01', name: 'Governance and Operational Management Policy',         category: 'governance' },
  { id: '02', name: 'Board and Leadership Accountability Framework',        category: 'governance' },
  { id: '03', name: 'Risk Management Policy and Procedure',                 category: 'governance' },
  { id: '04', name: 'Risk Register',                                        category: 'governance' },
  { id: '05', name: 'Business Continuity and Disaster Recovery Plan',       category: 'governance' },
  { id: '06', name: 'Conflict of Interest Policy and Register',             category: 'governance' },
  { id: '07', name: 'Document Control and Records Management Policy',       category: 'governance' },
  { id: '08', name: 'Financial Management Policy',                          category: 'governance' },
  { id: '09', name: 'Workforce Planning and HR Policy',                     category: 'hr' },
  { id: '10', name: 'Position Descriptions - Support Worker',               category: 'hr' },
  { id: '11', name: 'Position Descriptions - Team Leader',                  category: 'hr' },
  { id: '12', name: 'Position Descriptions - Service Manager',              category: 'hr' },
  { id: '13', name: 'Recruitment and Selection Policy and Procedure',       category: 'hr' },
  { id: '14', name: 'NDIS Worker Screening and Clearance Policy',           category: 'hr' },
  { id: '15', name: 'Worker Screening Register',                            category: 'hr' },
  { id: '16', name: 'Induction and Onboarding Policy and Procedure',        category: 'hr' },
  { id: '17', name: 'Staff Code of Conduct',                                category: 'hr' },
  { id: '18', name: 'Performance Management Policy and Procedure',          category: 'hr' },
  { id: '19', name: 'Training and Professional Development Policy',         category: 'hr' },
  { id: '20', name: 'Training Needs Analysis and Register',                 category: 'hr' },
  { id: '21', name: 'Supervision Policy and Procedure',                     category: 'hr' },
  { id: '22', name: 'Workforce Wellbeing and Fatigue Management Policy',    category: 'hr' },
  { id: '23', name: 'Participant Rights and Responsibilities Policy',       category: 'rights' },
  { id: '24', name: 'Privacy and Confidentiality Policy',                   category: 'rights' },
  { id: '25', name: 'Informed Consent Policy and Procedure',                category: 'rights' },
  { id: '26', name: 'Advocacy and Independent Support Policy',              category: 'rights' },
  { id: '27', name: 'Dignity of Risk Policy',                               category: 'rights' },
  { id: '28', name: 'Cultural Safety and Diversity Policy',                 category: 'rights' },
  { id: '29', name: 'Individual Support Planning Policy and Procedure',     category: 'support' },
  { id: '30', name: 'Support Plan Template',                                category: 'support' },
  { id: '31', name: 'Person-Centred Active Support Policy',                 category: 'support' },
  { id: '32', name: 'Assessment and Intake Procedure',                      category: 'support' },
  { id: '33', name: 'Transition Planning Policy and Procedure',             category: 'support' },
  { id: '34', name: 'Daily Living and Household Support Procedure',         category: 'support' },
  { id: '35', name: 'Community Participation and Social Inclusion Policy',  category: 'support' },
  { id: '36', name: 'Transport Policy and Procedure',                       category: 'support' },
  { id: '37', name: 'Medication Management Policy and Procedure',           category: 'support' },
  { id: '38', name: 'Mealtime Management Policy and Procedure',             category: 'support' },
  { id: '39', name: 'Work Health and Safety Policy',                        category: 'safety' },
  { id: '40', name: 'WHS Risk Assessment Template',                         category: 'safety' },
  { id: '41', name: 'Emergency Evacuation and Management Procedure',        category: 'safety' },
  { id: '42', name: 'Hazard Reporting and Incident Register',               category: 'safety' },
  { id: '43', name: 'Manual Handling Policy and Procedure',                 category: 'safety' },
  { id: '44', name: 'First Aid Policy and Procedure',                       category: 'safety' },
  { id: '45', name: 'Infection Control and Hygiene Policy',                 category: 'safety' },
  { id: '46', name: 'Restrictive Practices Policy and Procedure',           category: 'safety' },
  { id: '47', name: 'Restrictive Practices Register and Authorisation Record', category: 'safety' },
  { id: '48', name: 'Missing Person Procedure',                             category: 'safety' },
  { id: '49', name: 'Incident Management Policy and Procedure',             category: 'incidents' },
  { id: '50', name: 'Incident Report Form',                                 category: 'incidents' },
  { id: '51', name: 'Serious Incident Reportable to NDIS Commission Procedure', category: 'incidents' },
  { id: '52', name: 'Complaints Management Policy and Procedure',           category: 'incidents' },
  { id: '53', name: 'Complaints Register',                                  category: 'incidents' },
  { id: '54', name: 'Feedback and Continuous Improvement Policy',           category: 'incidents' },
  { id: '55', name: 'Continuous Improvement Register',                      category: 'incidents' },
  { id: '56', name: 'Safeguarding and Abuse Prevention Policy',             category: 'safeguarding' },
  { id: '57', name: 'Reportable Conduct Policy and Procedure',              category: 'safeguarding' },
  { id: '58', name: 'Mandatory Reporting Obligations Policy',               category: 'safeguarding' },
  { id: '59', name: 'Safe Environment Policy',                              category: 'safeguarding' },
  { id: '60', name: 'Participant Wellbeing Check Procedure',                category: 'safeguarding' },
  { id: '61', name: 'SIL Service Agreement Template',                       category: 'sil' },
  { id: '62', name: 'SIL House Rules and Tenant Rights Policy',             category: 'sil' },
  { id: '63', name: 'SIL Rostering and Staffing Ratio Policy',              category: 'sil' },
  { id: '64', name: 'SIL Property and Maintenance Management Procedure',    category: 'sil' },
  { id: '65', name: 'NDIS Participant Exit and Transition Procedure',       category: 'sil' },
];

// Documents included in the free sample (3 docs)
const FREE_SAMPLE_IDS = ['49', '52', '03'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, email, name, productTier, quizAnswers, orgName } = req.body;

  if (!email || !productTier) {
    return res.status(400).json({ error: 'Missing required fields: email, productTier' });
  }

  console.log(`Generating documents for: ${email} — ${productTier}`);

  try {
    // 1. Determine which docs to deliver based on product tier
    const docsToDeliver = productTier === 'free_sample'
      ? DOCUMENT_LIBRARY.filter(d => FREE_SAMPLE_IDS.includes(d.id))
      : DOCUMENT_LIBRARY; // registration_kit and value_bundle get all 65

    // 2. Use OpenAI to generate personalised variable values from quiz answers
    const variables = await generateVariables({ orgName, name, email, quizAnswers });

    // 3. Build the download manifest — signed URLs to the master templates
    //    (templates are stored in Supabase Storage bucket 'templates')
    //    For MVP: we deliver the master templates with a personalisation cover sheet
    //    Phase 2: server-side .docx variable substitution
    const downloadManifest = [];

    for (const doc of docsToDeliver) {
      const fileName = `${doc.id.padStart(2, '0')} - ${doc.name}.docx`;

      // Generate a signed URL (valid 7 days) for each template
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('templates')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      if (urlError) {
        console.warn(`Could not sign URL for ${fileName}:`, urlError.message);
        continue;
      }

      downloadManifest.push({
        id:       doc.id,
        name:     doc.name,
        category: doc.category,
        url:      signedUrl.signedUrl,
      });
    }

    // 4. Save the order's document access record to Supabase
    const accessToken = generateAccessToken();
    const expiresAt   = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

    const { error: accessError } = await supabase
      .from('document_access')
      .insert({
        order_id:          orderId || null,
        email,
        product_tier:      productTier,
        access_token:      accessToken,
        variables:         variables,
        doc_count:         downloadManifest.length,
        expires_at:        expiresAt,
        created_at:        new Date().toISOString(),
      });

    if (accessError) {
      console.error('Failed to save document access record:', accessError);
      throw accessError;
    }

    // 5. Trigger delivery email
    const downloadUrl = `https://ndis-ready.com.au/download?token=${accessToken}`;

    await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ndis-ready.com.au'}/api/send-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'document_delivery',
          email,
          name:        name || orgName || 'there',
          data: {
            orgName:      orgName || name,
            productTier,
            docCount:     downloadManifest.length,
            downloadUrl,
            variables,
            expiresAt,
          },
        }),
      }
    );

    console.log(`Documents queued for delivery: ${downloadManifest.length} docs → ${email}`);

    return res.status(200).json({
      success:     true,
      docCount:    downloadManifest.length,
      downloadUrl,
      expiresAt,
    });

  } catch (err) {
    console.error('generate-documents error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// =============================================================
// OPENAI — Generate personalised variable values from quiz
// =============================================================
async function generateVariables({ orgName, name, email, quizAnswers }) {
  const today        = new Date();
  const reviewDate   = today.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
  const nextReview   = new Date(today.setFullYear(today.getFullYear() + 1))
    .toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

  // Base variables — always populated
  const baseVars = {
    org_name:            orgName || name || 'Your Organisation',
    document_owner:      name   || 'Service Manager',
    review_date:         reviewDate,
    next_review_date:    nextReview,
    abn:                 '{{ABN — add your ABN}}',
    practice_standard_ref: 'NDIS Practice Standards 2021',
    state:               'New South Wales',
    purpose_statement:   'This policy establishes the framework and obligations required to meet NDIS Practice Standards.',
    scope_statement:     `This policy applies to all staff, contractors, and volunteers of ${orgName || 'the organisation'}.`,
    policy_statement:    'The organisation is committed to delivering safe, high-quality, person-centred supports in accordance with the NDIS Practice Standards and Code of Conduct.',
    procedures:          'Refer to the detailed procedures section. All staff must complete mandatory training before commencing support delivery.',
    roles_and_responsibilities: 'Service Manager: overall accountability. Team Leaders: day-to-day implementation. Support Workers: adherence to procedures.',
    related_documents:   'Refer to the complete NDIS Ready Document Library for related policies and forms.',
  };

  // If we have quiz answers, enrich with OpenAI
  if (quizAnswers && Object.keys(quizAnswers).length > 0) {
    try {
      const prompt = `You are helping an Australian NDIS provider personalise their compliance policy documents.

Organisation: ${orgName || name}
Quiz answers: ${JSON.stringify(quizAnswers, null, 2)}

Based on this information, provide specific, professional values for these policy document variables:
- state: (Australian state/territory they operate in)
- purpose_statement: (1-2 sentences specific to their org type and supports)
- scope_statement: (who the policy applies to, specific to their workforce size and structure)
- policy_statement: (commitment statement tailored to their support types)
- procedures: (key procedural steps relevant to their service type)
- roles_and_responsibilities: (roles specific to their org structure)

Respond ONLY with a valid JSON object with these exact keys. Be professional, specific, and NDIS-compliant. Do not use placeholder text.`;

      const completion = await openai.chat.completions.create({
        model:       'gpt-4o-mini',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const aiVars = JSON.parse(completion.choices[0].message.content);
      return { ...baseVars, ...aiVars };

    } catch (aiErr) {
      console.warn('OpenAI enrichment failed, using base variables:', aiErr.message);
    }
  }

  return baseVars;
}

function generateAccessToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

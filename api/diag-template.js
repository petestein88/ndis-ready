// TEMPORARY DIAGNOSTIC + FREE-SAMPLE FIXER. Gated by internal secret.
// DELETE after investigation.
//   GET  ?action=inspect&path=...        → list placeholders in a template
//   GET  ?action=list&prefix=65 Files/   → list files under a prefix
//   POST ?action=fix-free-samples        → rewrite the 3 free samples to lowercase vars
const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');
const { isInternalCall } = require('./_lib/security');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function placeholdersIn(buf) {
  const zip = new PizZip(buf);
  let xml = '';
  Object.keys(zip.files).forEach((f) => {
    if (/word\/(document|header\d*|footer\d*)\.xml$/.test(f)) xml += zip.files[f].asText();
  });
  const visible = xml.replace(/<[^>]+>/g, '');
  const found = visible.match(/\{\{\s*[\w.]+\s*\}\}/g) || [];
  const rawOpen = (xml.match(/\{\{/g) || []).length;
  const rawClose = (xml.match(/\}\}/g) || []).length;
  return { found: [...new Set(found)], count: found.length, rawOpen, rawClose };
}

module.exports = async function handler(req, res) {
  if (!isInternalCall(req)) return res.status(403).json({ error: 'Forbidden' });
  const action = (req.query && req.query.action) || 'inspect';

  try {
    if (action === 'list') {
      const prefix = (req.query.prefix || '65 Files').replace(/\/$/, '');
      const { data, error } = await supabase.storage.from('templates').list(prefix, { limit: 200 });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ prefix, files: data.map((f) => f.name) });
    }

    if (action === 'inspect') {
      const path = req.query.path;
      const { data, error } = await supabase.storage.from('templates').download(path);
      if (error || !data) return res.status(404).json({ error: error && error.message, path });
      const buf = Buffer.from(await data.arrayBuffer());
      return res.status(200).json({ path, sizeBytes: buf.length, ...placeholdersIn(buf) });
    }

    if (action === 'fix-free-samples' && req.method === 'POST') {
      // Map the OLD uppercase free-sample placeholders → code variable names.
      const RENAME = {
        ORGANISATION_NAME: 'org_name',
        DATE_ADOPTED: 'review_date',
        REVIEW_DATE: 'next_review_date',
        POLICY_OWNER_TITLE: 'document_owner',
        APPROVED_BY: 'director_name',
        INCIDENT_MANAGER_TITLE: 'service_manager_name',
        CEO_NAME: 'director_name',
        RISK_OFFICER_TITLE: 'compliance_officer_name',
        AUTHOR: 'document_owner',
        OFFICE_ADDRESS: 'full_address',
        POSTAL_ADDRESS: 'full_address',
        PHONE_NUMBER: 'phone',
        COMPLAINTS_EMAIL: 'email',
        PUBLIC_LIABILITY_AMOUNT: 'public_liability_amount',
        PROFESSIONAL_INDEMNITY_AMOUNT: 'professional_indemnity_amount',
        MANAGEMENT_LIABILITY_AMOUNT: 'management_liability_amount',
        CYBER_LIABILITY_AMOUNT: 'cyber_liability_amount',
      };
      const files = [
        'free-samples/incident-management-policy.docx',
        'free-samples/complaints-management-policy.docx',
        'free-samples/risk-management-framework.docx',
      ];
      const report = [];
      for (const path of files) {
        const { data, error } = await supabase.storage.from('templates').download(path);
        if (error || !data) { report.push({ path, error: error && error.message }); continue; }
        const buf = Buffer.from(await data.arrayBuffer());
        const zip = new PizZip(buf);
        const before = placeholdersIn(buf);

        Object.keys(zip.files).forEach((f) => {
          if (/word\/(document|header\d*|footer\d*)\.xml$/.test(f)) {
            let xml = zip.files[f].asText();
            for (const [oldName, newName] of Object.entries(RENAME)) {
              // Replace {{OLD}} (allowing internal whitespace) with {{new}}.
              const re = new RegExp('\\{\\{\\s*' + oldName + '\\s*\\}\\}', 'g');
              xml = xml.replace(re, '{{' + newName + '}}');
            }
            zip.file(f, xml);
          }
        });
        const outBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        const after = placeholdersIn(outBuf);
        const { error: upErr } = await supabase.storage.from('templates').upload(path, outBuf, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
        report.push({ path, before: before.found, after: after.found, uploadError: upErr && upErr.message });
      }
      return res.status(200).json({ action, report });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

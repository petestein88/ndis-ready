// =============================================================
// TEMPORARY admin endpoint — uploads the HR Pack templates from
// the bundled repo (/hr-templates) into Supabase Storage
// templates/HR Pack/. Protected by a one-time secret.
// DELETE THIS FILE after running once.
// =============================================================
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

module.exports = async function handler(req, res) {
  if ((req.query.secret || '') !== 'hrpack-2026-deploy-once') {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const dir = path.join(process.cwd(), 'hr-templates');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));
    const results = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(dir, f));
      const { error } = await supabase.storage
        .from('templates')
        .upload(`HR Pack/${f}`, buf, { contentType: CT, upsert: true });
      results.push({ file: f, ok: !error, error: error ? error.message : null });
    }
    return res.status(200).json({ uploaded: results.filter(r => r.ok).length, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

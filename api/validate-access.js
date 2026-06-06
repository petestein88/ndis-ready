// =============================================================
// NDIS Ready — Access token validation
// POST /api/validate-access   Body: { token }
// Confirms the token matches a real purchase in document_access
// (any paid tier). Used by the Audit Readiness tool to unlock the
// full report. Returns { valid, tier } — never any personal data.
// =============================================================
const { createClient } = require('@supabase/supabase-js');
const { applyCors } = require('./_lib/security');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = ((req.body && req.body.token) || '').toString().trim();
  if (!token) return res.status(400).json({ valid: false, error: 'missing_token' });

  try {
    const { data: rows, error } = await supabase
      .from('document_access')
      .select('product_tier')
      .eq('access_token', token)
      .limit(1);

    if (error) {
      console.error('validate-access lookup failed:', error.message);
      return res.status(500).json({ valid: false, error: 'lookup_failed' });
    }
    if (!rows || rows.length === 0) {
      return res.status(200).json({ valid: false });
    }
    return res.status(200).json({ valid: true, tier: rows[0].product_tier || 'paid' });
  } catch (err) {
    console.error('validate-access error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
};

/**
 * POST /api/mark-downloaded
 *
 * Records the first-access timestamp on a document_access record.
 * Called from download.html client-side JS using the access token.
 * Uses service key server-side so RLS is not an issue.
 *
 * Expected body: { token }
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY   // service key bypasses RLS
  );

  const { error } = await supabase
    .from('document_access')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('access_token', token)
    .is('downloaded_at', null);        // only stamp first access

  if (error) {
    console.error('mark-downloaded error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
};

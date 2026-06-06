// TEMPORARY DIAGNOSTIC — inspect a template for {{placeholders}}.
// Gated by internal secret. DELETE after investigation.
const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');
const { isInternalCall } = require('./_lib/security');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async function handler(req, res) {
  if (!isInternalCall(req)) return res.status(403).json({ error: 'Forbidden' });

  const path = (req.query && req.query.path) || 'free-samples/incident-management-policy.docx';
  try {
    const { data, error } = await supabase.storage.from('templates').download(path);
    if (error || !data) return res.status(404).json({ error: error && error.message, path });

    const buf = Buffer.from(await data.arrayBuffer());
    const zip = new PizZip(buf);

    // Concatenate all document XML parts (document.xml + headers/footers)
    let xml = '';
    Object.keys(zip.files).forEach((f) => {
      if (/word\/(document|header\d*|footer\d*)\.xml$/.test(f)) {
        xml += zip.files[f].asText();
      }
    });

    // Strip XML tags to get the visible text, then find {{ }} tokens.
    const visibleText = xml.replace(/<[^>]+>/g, '');
    const placeholderMatches = visibleText.match(/\{\{\s*[\w.]+\s*\}\}/g) || [];

    // Also detect placeholders that may be SPLIT across runs (Word often
    // breaks {{org_name}} into multiple <w:t> runs, which breaks docxtemplater).
    // Heuristic: count lone {{ and }} occurrences in raw XML.
    const openBraces = (xml.match(/\{\{/g) || []).length;
    const closeBraces = (xml.match(/\}\}/g) || []).length;
    const looseOpen = (visibleText.match(/\{/g) || []).length;

    return res.status(200).json({
      path,
      sizeBytes: buf.length,
      placeholdersFound: [...new Set(placeholderMatches)],
      placeholderCount: placeholderMatches.length,
      rawOpenBraces: openBraces,
      rawCloseBraces: closeBraces,
      looseSingleBraces: looseOpen,
      textSample: visibleText.slice(0, 800),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

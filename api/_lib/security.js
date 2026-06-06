// =============================================================
// NDIS Ready — Shared security helpers
//   - applyCors(): restrict browser calls to our own origins
//   - isInternalCall(): verify server-to-server calls carry the
//     INTERNAL_API_SECRET so only our own functions (webhook,
//     generate-documents) can trigger privileged actions.
// =============================================================

// Origins allowed to call our public browser-facing endpoints.
const ALLOWED_ORIGINS = [
  'https://ndis-ready.com.au',
  'https://www.ndis-ready.com.au',
];

// Header used for internal server-to-server authentication.
const INTERNAL_HEADER = 'x-internal-secret';

/**
 * Apply restrictive CORS. Echoes the request origin only if it is in our
 * allow-list; otherwise falls back to the canonical apex domain. Handles the
 * OPTIONS preflight. Returns true if the request was a preflight and has been
 * fully handled (caller should return immediately).
 */
function applyCors(req, res, { methods = 'POST, OPTIONS', headers = 'Content-Type, x-internal-secret' } = {}) {
  const origin = req.headers.origin;
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * True when the caller presented the correct internal secret. Used to gate
 * privileged endpoints (paid document generation, transactional email) so they
 * can only be triggered by our own server-side code, never by the public.
 *
 * Fails closed: if INTERNAL_API_SECRET is not configured, no external caller
 * can ever pass, but our own functions (which set the same env var) still can.
 */
function isInternalCall(req) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return false;
  const provided = req.headers[INTERNAL_HEADER];
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

/** Convenience: the header object to attach to internal fetch() calls. */
function internalHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    [INTERNAL_HEADER]: process.env.INTERNAL_API_SECRET || '',
    ...extra,
  };
}

module.exports = { applyCors, isInternalCall, internalHeaders, ALLOWED_ORIGINS, INTERNAL_HEADER };

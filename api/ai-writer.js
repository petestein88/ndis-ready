// =============================================================
// NDIS Ready — AI Note & Incident Report Writer
// POST /api/ai-writer
// Turns a provider's rough notes into a clean, NDIS-aligned
// progress note OR a structured reportable-incident report.
//
// Body: { mode: 'note' | 'incident', rawText, context?, token? }
//
// Access model:
//   - First 5 uses are free (enforced client-side + soft server cap).
//   - After that, a valid purchase token (any paid tier) is required.
//     The client sends ?token / pasted token; we validate it against
//     the Supabase `document_access` table (same tokens used for
//     document downloads).
//
// Privacy: note/incident TEXT is processed in-memory only and is
//   NEVER stored. We log usage metadata only (mode, char count,
//   token-or-"trial", timestamp).
// =============================================================

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { applyCors } = require('./_lib/security');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FREE_TRIAL_LIMIT = 5;
const MAX_INPUT_CHARS = 6000;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const mode = body.mode === 'incident' ? 'incident' : 'note';
    const rawText = (body.rawText || '').toString().trim();
    const context = (body.context || '').toString().trim();
    const token = (body.token || '').toString().trim();
    const trialCount = Number.isFinite(+body.trialCount) ? +body.trialCount : 0;

    if (!rawText || rawText.length < 10) {
      return res.status(400).json({
        error: 'Please enter at least a sentence or two of rough notes to work with.',
      });
    }

    // -----------------------------------------------------------
    // ACCESS CONTROL
    // If the client has used fewer than the free limit, allow it.
    // Otherwise a valid paid token is required.
    // -----------------------------------------------------------
    let access = 'trial';
    if (trialCount >= FREE_TRIAL_LIMIT) {
      if (!token) {
        return res.status(402).json({
          error: 'trial_exhausted',
          message: `You've used all ${FREE_TRIAL_LIMIT} free generations. Unlock unlimited use with any NDIS Ready purchase.`,
        });
      }

      // Validate token against document_access (any paid tier counts)
      const { data: rows, error: tokenErr } = await supabase
        .from('document_access')
        .select('access_token, product_tier, email')
        .eq('access_token', token)
        .limit(1);

      if (tokenErr) {
        console.error('Token lookup failed:', tokenErr.message);
        return res.status(500).json({ error: 'Could not verify your access. Please try again.' });
      }

      if (!rows || rows.length === 0) {
        return res.status(403).json({
          error: 'invalid_token',
          message: 'That access code was not recognised. Use the link from your purchase email.',
        });
      }

      access = `paid:${rows[0].product_tier || 'unknown'}`;
    }

    // -----------------------------------------------------------
    // BUILD THE PROMPT — mode flag swaps the system instruction
    // -----------------------------------------------------------
    const truncated = rawText.slice(0, MAX_INPUT_CHARS);
    const { systemPrompt, userPrompt } = buildPrompt(mode, truncated, context);

    let output = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      });
      output = (completion.choices[0].message.content || '').trim();
    } catch (openaiErr) {
      console.error('OpenAI ai-writer error:', openaiErr.message);
      return res.status(502).json({ error: 'The AI writer is busy right now. Please try again in a moment.' });
    }

    // -----------------------------------------------------------
    // LOG METADATA ONLY — never the note/incident text itself
    // -----------------------------------------------------------
    supabase
      .from('tool_usage')
      .insert({
        tool: 'ai_writer',
        mode,
        access,
        input_chars: truncated.length,
        output_chars: output.length,
      })
      .then(({ error }) => {
        if (error) console.warn('tool_usage log failed (non-fatal):', error.message);
      });

    return res.status(200).json({
      success: true,
      mode,
      access,
      output,
    });

  } catch (err) {
    console.error('ai-writer error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// =============================================================
// Prompt builder — one function, two modes
// =============================================================
function buildPrompt(mode, rawText, context) {
  if (mode === 'incident') {
    const systemPrompt = `You are an expert in Australian NDIS (National Disability Insurance Scheme) quality and safeguarding compliance. You help disability service providers turn rough, informal notes about an incident into a clear, professional, structured incident report that aligns with the NDIS Commission's reportable-incidents expectations and the NDIS Practice Standards.

Write in plain, objective, factual Australian English. Record only what is described in the notes — never invent facts, names, times, injuries, or outcomes that are not present. Where critical information is missing, add a clearly marked "[TO CONFIRM: ...]" placeholder so staff know what to fill in. Keep the tone neutral and non-judgemental. Do not include participant surnames or identifying details beyond what is given.

Structure the report under these headings:
1. Incident Summary (one or two sentences)
2. Date, Time & Location
3. People Involved (participant(s), workers, witnesses — use roles/first names or initials as given)
4. Description of What Happened (objective, chronological, factual)
5. Immediate Actions Taken
6. Injuries or Harm (if any)
7. Notifications Made / Required (e.g. NDIS Commission, family/guardian, police — flag if a reportable incident category may apply)
8. Risk & Contributing Factors
9. Follow-up Actions & Preventative Measures
10. Reported By / Date Completed (leave "[TO CONFIRM]" placeholders)

If the notes describe something that may be a reportable incident (death, serious injury, abuse or neglect, unlawful sexual or physical contact, sexual misconduct, or unauthorised use of restrictive practices), add a clear note at the top: ">> POSSIBLE REPORTABLE INCIDENT — review against NDIS Commission requirements and notify within required timeframes."

Return the finished report as clean text with the numbered headings. Do not add commentary before or after the report.`;

    const userPrompt = `${context ? `Provider/context details: ${context}\n\n` : ''}Rough incident notes to turn into a structured report:\n\n"""\n${rawText}\n"""`;
    return { systemPrompt, userPrompt };
  }

  // Default: progress note
  const systemPrompt = `You are an expert support worker and NDIS documentation specialist in Australia. You help disability service providers turn rough, informal shift notes into clean, professional progress notes that meet NDIS Practice Standards and would stand up in an audit.

Write in plain, objective, factual Australian English, in past tense, third person. Record only what is described in the notes — never invent activities, outcomes, observations, or quotes that are not present. Where important detail is missing, add a clearly marked "[TO CONFIRM: ...]" placeholder. Focus on what was observed and done, the participant's response, progress toward their goals, and any concerns. Keep it concise and person-centred. Do not include participant surnames or identifying details beyond what is given. Avoid clinical diagnoses or judgemental language.

Structure the progress note as:
- Date & Shift (use "[TO CONFIRM]" if not given)
- Support Provided (what was done during the shift)
- Participant's Engagement & Response
- Progress Toward Goals (link to goals only if mentioned)
- Observations / Concerns (note any safeguarding or health concerns; flag if follow-up is needed)
- Follow-up / Handover

Return the finished progress note as clean text under those headings. Do not add commentary before or after the note.`;

  const userPrompt = `${context ? `Provider/context details: ${context}\n\n` : ''}Rough shift notes to turn into a professional progress note:\n\n"""\n${rawText}\n"""`;
  return { systemPrompt, userPrompt };
}

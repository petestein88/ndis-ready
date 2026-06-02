// =============================================================
// NDIS Ready — AI Profile Extraction from Uploaded Documents
// POST /api/extract-profile
// Accepts multipart file upload (PDF or DOCX), sends to
// OpenAI GPT-4o with vision/text extraction, returns
// structured JSON matching all 40 org profile fields.
// Files are processed in-memory — never stored.
// =============================================================

const OpenAI = require('openai');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Vercel config — disable default body parser so we can handle raw multipart
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse multipart form data using built-in formData parsing
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    // Extract boundary and parse multipart
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid multipart request — no boundary found' });
    }

    const boundary = boundaryMatch[1];
    const parts = parseMultipart(rawBody, boundary);
    const filePart = parts.find(p => p.filename);

    if (!filePart) {
      return res.status(400).json({ error: 'No file found in upload' });
    }

    const filename = filePart.filename.toLowerCase();
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const isAllowed = allowedTypes.some(ext => filename.endsWith(ext));

    if (!isAllowed) {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' });
    }

    console.log(`Extracting profile from: ${filePart.filename} (${filePart.data.length} bytes)`);

    // Build extraction prompt
    const extractionPrompt = `You are an expert at reading Australian NDIS (National Disability Insurance Scheme) provider documents and extracting organisational information.

Analyse the attached document and extract as many of the following details as you can find. Only extract information that is explicitly stated — do not guess or invent values. Use null for fields you cannot find.

Return ONLY a valid JSON object with these exact keys:

{
  // IDENTITY
  "org_name": string | null,           // Full legal organisation name
  "trading_name": string | null,        // Trading name if different
  "abn": string | null,                 // Australian Business Number (format: XX XXX XXX XXX)
  "acn": string | null,                 // Australian Company Number if applicable
  "org_type": string | null,            // e.g. "Sole Trader", "Pty Ltd", "Not-for-profit", "Association"
  "registration_status": string | null, // e.g. "Registered NDIS Provider", "New Applicant"
  "ndis_provider_number": string | null,// NDIS provider number if present
  "established_year": string | null,    // Year organisation was established
  "website": string | null,
  "phone": string | null,
  "email": string | null,

  // ADDRESS
  "street_address": string | null,
  "suburb": string | null,
  "state": string | null,               // Australian state/territory abbreviation e.g. NSW, VIC
  "postcode": string | null,

  // KEY PEOPLE
  "director_name": string | null,       // Director or Owner name
  "director_title": string | null,      // e.g. "Director", "Owner", "CEO"
  "service_manager_name": string | null,
  "compliance_officer_name": string | null,
  "safeguarding_officer_name": string | null,
  "whs_officer_name": string | null,

  // REGISTRATION
  "audit_pathway": string | null,       // "Verification" or "Certification"
  "registration_groups": string | null, // Comma-separated list of NDIS registration groups
  "support_types": string | null,       // Types of supports delivered
  "operates_in_home": boolean | null,   // Does provider support people in their home?
  "manages_participant_funds": boolean | null,
  "employs_staff": boolean | null,
  "staff_count": string | null,         // Approximate number of staff
  "works_with_children": boolean | null,
  "provides_medication_support": boolean | null,

  // OPERATIONS
  "service_areas": string | null,       // Geographic areas served
  "operating_hours": string | null,
  "after_hours_contact": string | null,
  "emergency_contact_name": string | null,
  "emergency_contact_phone": string | null,
  "insurance_provider": string | null,
  "insurance_policy_number": string | null,
  "bank_name": string | null,
  "bsb": string | null,
  "account_number": string | null,

  // EXTRACTION METADATA
  "confidence_score": number,           // 0-100 — how confident are you in the overall extraction?
  "extracted_fields_count": number,     // How many non-null fields were extracted?
  "document_type_detected": string,     // What type of document was this? e.g. "Registration Form", "Annual Report", "Policy Document"
  "extraction_notes": string | null     // Any important caveats about the extraction
}`;

    let extractedData;

    // -------------------------------------------------------------
    // STEP 1 — Extract the ACTUAL text out of the uploaded file.
    // PDF  -> pdf-parse, DOCX/DOC -> mammoth, TXT -> utf-8.
    // (The old version uploaded the file to OpenAI but never sent
    //  its content, so only the filename was ever "read".)
    // -------------------------------------------------------------
    let documentText = '';
    try {
      if (filename.endsWith('.pdf')) {
        const parsed = await pdfParse(filePart.data);
        documentText = parsed.text || '';
      } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
        const result = await mammoth.extractRawText({ buffer: filePart.data });
        documentText = result.value || '';
      } else if (filename.endsWith('.txt')) {
        documentText = filePart.data.toString('utf-8');
      }
    } catch (parseErr) {
      console.error('Document text extraction failed:', parseErr.message);
      return res.status(422).json({
        error: 'We could not read the contents of that file. Please try a different file or fill in your details manually.',
      });
    }

    documentText = (documentText || '').trim();
    if (documentText.length < 20) {
      return res.status(422).json({
        error: 'That file appears to be empty or image-only. Please upload a text-based document or fill in your details manually.',
      });
    }

    // Cap the text we send to the model (keep cost & latency sane)
    const MAX_CHARS = 16000;
    const truncatedText = documentText.slice(0, MAX_CHARS);

    // -------------------------------------------------------------
    // STEP 2 — Send the REAL text to GPT-4o for structured extraction
    // -------------------------------------------------------------
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `${extractionPrompt}\n\n--- DOCUMENT FILENAME: ${filePart.filename} ---\n\n--- DOCUMENT TEXT START ---\n${truncatedText}\n--- DOCUMENT TEXT END ---`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      extractedData = JSON.parse(completion.choices[0].message.content);
    } catch (openaiErr) {
      console.error('OpenAI extraction error:', openaiErr.message);
      throw openaiErr;
    }

    // Sanitise output — remove any null values for cleaner response
    const sanitised = {};
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== null && value !== undefined && value !== '') {
        sanitised[key] = value;
      }
    }

    // Ensure metadata fields always present
    sanitised.confidence_score = extractedData.confidence_score || 0;
    sanitised.extracted_fields_count = Object.values(extractedData).filter(
      v => v !== null && v !== undefined && v !== ''
    ).length;
    sanitised.document_type_detected = extractedData.document_type_detected || 'Unknown Document';

    console.log(`Extraction complete: ${sanitised.extracted_fields_count} fields, confidence: ${sanitised.confidence_score}%`);

    return res.status(200).json({
      success: true,
      data: sanitised,
      filename: filePart.filename,
      fieldsExtracted: sanitised.extracted_fields_count,
      confidence: sanitised.confidence_score,
    });

  } catch (err) {
    console.error('extract-profile error:', err);
    return res.status(500).json({
      error: 'Extraction failed. Please try again or fill in your details manually.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

// =============================================================
// Multipart parser — no dependencies needed
// =============================================================
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const finalBoundary  = Buffer.from('--' + boundary + '--');

  let start = 0;
  while (start < buffer.length) {
    const boundaryIdx = indexOf(buffer, boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    const headerStart = boundaryIdx + boundaryBuffer.length + 2; // skip \r\n
    const headerEnd   = indexOf(buffer, Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headerStr = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;

    const nextBoundary = indexOf(buffer, boundaryBuffer, dataStart);
    if (nextBoundary === -1) break;

    const dataEnd = nextBoundary - 2; // trim \r\n before boundary
    const data    = buffer.slice(dataStart, dataEnd);

    // Parse headers
    const headers = {};
    for (const line of headerStr.split('\r\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        headers[line.slice(0, colonIdx).trim().toLowerCase()] = line.slice(colonIdx + 1).trim();
      }
    }

    // Extract name and filename from Content-Disposition
    const disposition = headers['content-disposition'] || '';
    const nameMatch   = disposition.match(/name="([^"]+)"/);
    const fileMatch   = disposition.match(/filename="([^"]+)"/);

    parts.push({
      name:     nameMatch     ? nameMatch[1]     : null,
      filename: fileMatch     ? fileMatch[1]     : null,
      type:     headers['content-type'] || 'application/octet-stream',
      data,
    });

    start = nextBoundary;

    // Check if this is the final boundary
    if (indexOf(buffer, finalBoundary, nextBoundary) === nextBoundary) break;
  }

  return parts;
}

function indexOf(buffer, search, offset = 0) {
  for (let i = offset; i <= buffer.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buffer[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

function getMimeType(filename) {
  if (filename.endsWith('.pdf'))  return 'application/pdf';
  if (filename.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (filename.endsWith('.doc'))  return 'application/msword';
  if (filename.endsWith('.txt'))  return 'text/plain';
  return 'application/octet-stream';
}

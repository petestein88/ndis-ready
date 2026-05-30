# NDIS Ready — Supabase Setup

## Run in this order:

### 1. Schema (tables)
Go to: Supabase Dashboard → SQL Editor → New query
Paste and run: `schema.sql`

### 2. Storage (buckets)
Paste and run: `storage.sql`

### 3. Upload templates
Go to: Supabase Dashboard → Storage → templates bucket
Upload all 65 `.docx` files from `C:\Users\Pete\Desktop\ndisGO\65 Docs\`

File names must match exactly:
```
01 - Governance and Operational Management Policy.docx
02 - Board and Leadership Accountability Framework.docx
... (all 65)
65 - NDIS Participant Exit and Transition Procedure.docx
```

## Tables created:
- `orders` — one row per Stripe payment
- `document_access` — tracks download tokens and personalisation variables
- `document_downloads` — audit log of every file downloaded
- `webhook_log` — audit trail of all Stripe webhook events

## Buckets created:
- `templates` — master .docx files (private, signed URLs only)
- `customer-docs` — future AI-generated personalised docs (private)

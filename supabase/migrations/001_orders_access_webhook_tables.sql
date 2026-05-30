-- =============================================================
-- NDIS Ready — Supabase Migration 001
-- Creates: orders, document_access, webhook_log tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- ── orders ────────────────────────────────────────────────────
-- Records every Stripe payment (one row per checkout.session)
CREATE TABLE IF NOT EXISTS orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id      TEXT UNIQUE NOT NULL,
  stripe_payment_intent  TEXT,
  stripe_subscription_id TEXT,
  email                  TEXT NOT NULL,
  name                   TEXT,
  amount_cents           INTEGER NOT NULL,
  product_tier           TEXT NOT NULL CHECK (product_tier IN ('registration_kit','value_bundle','free_sample')),
  status                 TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','canceled','failed')),
  paid_at                TIMESTAMPTZ,
  refunded_at            TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

-- RLS: only service role can read/write (no anon access)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON orders
  FOR ALL USING (auth.role() = 'service_role');


-- ── document_access ───────────────────────────────────────────
-- Stores the access token + signed-URL manifest for each order
-- The /download?token= page reads this to render download links
CREATE TABLE IF NOT EXISTS document_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  product_tier  TEXT NOT NULL,
  access_token  TEXT UNIQUE NOT NULL,
  variables     JSONB,
  manifest      JSONB,
  doc_count     INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  downloaded_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_access_token_idx  ON document_access (access_token);
CREATE INDEX IF NOT EXISTS document_access_email_idx  ON document_access (email);
CREATE INDEX IF NOT EXISTS document_access_expiry_idx ON document_access (expires_at);

ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON document_access
  FOR ALL USING (auth.role() = 'service_role');

-- Allow token-based public read (for /download page)
CREATE POLICY "Token-based public read" ON document_access
  FOR SELECT USING (expires_at > NOW());


-- ── webhook_log ───────────────────────────────────────────────
-- Append-only log of all Stripe webhook events received
CREATE TABLE IF NOT EXISTS webhook_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,
  stripe_id      TEXT,
  customer_email TEXT,
  metadata       JSONB DEFAULT '{}',
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_log_event_type_idx ON webhook_log (event_type);
CREATE INDEX IF NOT EXISTS webhook_log_received_idx   ON webhook_log (received_at DESC);

ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON webhook_log
  FOR ALL USING (auth.role() = 'service_role');


-- ── document_downloads (already exists — add manifest column) ─
-- Ensure the manifest column exists if the table was created earlier
ALTER TABLE document_downloads
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free_sample',
  ADD COLUMN IF NOT EXISTS documents JSONB;

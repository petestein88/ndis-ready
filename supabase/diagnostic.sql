-- ================================================================
-- NDIS Ready — Supabase Architecture Diagnostic
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- Copy the full output and paste back to your dev session
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ALL TABLES in public schema (name, row count, size)
-- ----------------------------------------------------------------
SELECT
  t.table_name,
  c.reltuples::BIGINT                          AS approx_row_count,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- ----------------------------------------------------------------
-- 2. ALL COLUMNS across every table (name, type, nullable, default)
-- ----------------------------------------------------------------
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ----------------------------------------------------------------
-- 3. ALL INDEXES
-- ----------------------------------------------------------------
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ----------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — which tables have RLS enabled
-- ----------------------------------------------------------------
SELECT
  relname        AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;

-- ----------------------------------------------------------------
-- 5. ALL RLS POLICIES (table, policy name, command, roles, definition)
-- ----------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd        AS command,
  roles,
  qual       AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ----------------------------------------------------------------
-- 6. STORAGE BUCKETS
-- ----------------------------------------------------------------
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY created_at;

-- ----------------------------------------------------------------
-- 7. STORAGE OBJECTS — file listing (path, size, bucket)
--    Shows everything uploaded so we know what templates exist
-- ----------------------------------------------------------------
SELECT
  bucket_id,
  name        AS file_path,
  metadata->>'size'        AS size_bytes,
  metadata->>'mimetype'    AS mime_type,
  created_at
FROM storage.objects
ORDER BY bucket_id, name
LIMIT 200;

-- ----------------------------------------------------------------
-- 8. STORAGE RLS POLICIES
-- ----------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- ----------------------------------------------------------------
-- 9. LIVE DATA COUNTS per table
-- ----------------------------------------------------------------
SELECT 'leads'              AS table_name, COUNT(*) AS rows FROM leads
UNION ALL
SELECT 'document_downloads', COUNT(*) FROM document_downloads
UNION ALL
SELECT 'orders',             COUNT(*) FROM orders
UNION ALL
SELECT 'document_access',   COUNT(*) FROM document_access
UNION ALL
SELECT 'webhook_log',       COUNT(*) FROM webhook_log
ORDER BY table_name;

-- ----------------------------------------------------------------
-- 10. LEADS TABLE — sample of 5 most recent rows (no PII shown)
--     Shows which columns are actually being populated
-- ----------------------------------------------------------------
SELECT
  id,
  created_at,
  -- mask email: show domain only
  REGEXP_REPLACE(email, '^[^@]+', '***')  AS email_domain,
  org_name,
  score,
  state,
  service_type,
  -- show all column names that are non-null
  CASE WHEN quiz_answers IS NOT NULL THEN 'yes' ELSE 'no' END AS has_quiz_answers,
  CASE WHEN org_details  IS NOT NULL THEN 'yes' ELSE 'no' END AS has_org_details
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 11. ORDERS TABLE — most recent 5 (amounts + tiers, no PII)
-- ----------------------------------------------------------------
SELECT
  id,
  created_at,
  REGEXP_REPLACE(email, '^[^@]+', '***') AS email_domain,
  product_tier,
  amount_cents,
  status,
  paid_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 12. DOCUMENT_ACCESS — most recent 5
-- ----------------------------------------------------------------
SELECT
  id,
  created_at,
  REGEXP_REPLACE(email, '^[^@]+', '***') AS email_domain,
  product_tier,
  doc_count,
  download_count,
  expires_at,
  CASE WHEN variables IS NOT NULL THEN 'yes' ELSE 'no' END AS has_variables
FROM document_access
ORDER BY created_at DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 13. EXTENSIONS enabled
-- ----------------------------------------------------------------
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

-- ----------------------------------------------------------------
-- 14. FUNCTIONS defined in public schema
-- ----------------------------------------------------------------
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ================================================================
-- END OF DIAGNOSTIC — paste all output back to your dev session
-- ================================================================

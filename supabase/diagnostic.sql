-- ================================================================
-- NDIS Ready — Supabase Architecture Diagnostic v2
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- Copy the full output and paste back to your dev session
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ALL TABLES in public schema (name, approx row count, size)
-- ----------------------------------------------------------------
SELECT
  t.table_name,
  c.reltuples::BIGINT                           AS approx_row_count,
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
  relname             AS table_name,
  relrowsecurity      AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;

-- ----------------------------------------------------------------
-- 5. ALL RLS POLICIES
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
-- 7. STORAGE OBJECTS — every file uploaded (path, size, bucket)
-- ----------------------------------------------------------------
SELECT
  bucket_id,
  name                      AS file_path,
  metadata->>'size'         AS size_bytes,
  metadata->>'mimetype'     AS mime_type,
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
-- 9. LIVE ROW COUNTS — safe version using dynamic SQL
--    Won't crash if a table doesn't exist yet
-- ----------------------------------------------------------------
SELECT table_name, 
       (xpath('/row/c/text()', 
         query_to_xml(format('SELECT COUNT(*) AS c FROM %I', table_name), 
         false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ----------------------------------------------------------------
-- 10. LEADS TABLE — actual columns (auto-detected, no assumptions)
-- ----------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------
-- 10b. LEADS — 5 most recent rows using only safe columns
-- ----------------------------------------------------------------
SELECT
  id,
  created_at,
  REGEXP_REPLACE(email, '^[^@]+', '***') AS email_domain,
  org_name,
  source,
  CASE WHEN quiz_answers IS NOT NULL THEN 'yes' ELSE 'no' END AS has_quiz_answers
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- ----------------------------------------------------------------
-- 11. ORDERS TABLE — columns + 5 most recent (if table exists)
-- ----------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------
-- 12. DOCUMENT_ACCESS — columns (if table exists)
-- ----------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'document_access'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------
-- 13. WEBHOOK_LOG — columns (if table exists)
-- ----------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'webhook_log'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------
-- 14. EXTENSIONS enabled
-- ----------------------------------------------------------------
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

-- ----------------------------------------------------------------
-- 15. CUSTOM FUNCTIONS in public schema
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

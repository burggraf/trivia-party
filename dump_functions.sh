mkdir -p data/functions
psql $OLD_DB_URL -c "
SELECT pg_get_functiondef(p.oid) || ';'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';" > data/functions/functions.sql

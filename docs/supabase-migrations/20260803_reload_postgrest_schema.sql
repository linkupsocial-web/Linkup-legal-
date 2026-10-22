-- Run this only after docs/supabase-migrations/20260801_request_payment_hardening.sql.
-- It changes no table data. It asks PostgREST to reload its schema cache, then
-- provides read-only checks for the request/payment fields expected by the app.

notify pgrst, 'reload schema';

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'requests'
order by ordinal_position;

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('services', 'requests', 'payments', 'payment_events')
  and column_name in (
    'service_id',
    'pricing_type',
    'currency',
    'price_snapshot',
    'checkout_token_hash',
    'checkout_token_expires_at',
    'idempotency_key',
    'attempt_number',
    'provider_event_id',
    'processed_at',
    'processing_error'
  )
order by table_name, column_name;

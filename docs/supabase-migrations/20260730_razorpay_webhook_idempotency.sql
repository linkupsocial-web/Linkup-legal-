begin;

alter table public.payment_events
  add column if not exists event_key text;

create unique index if not exists payment_events_event_key_unique_idx
  on public.payment_events (event_key)
  where event_key is not null;

commit;

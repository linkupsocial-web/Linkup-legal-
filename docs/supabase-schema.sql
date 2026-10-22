create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text,
  category_slug text,
  icon text,
  image text,
  price numeric(12,2) default 0,
  pricing_type text not null default 'quote_required',
  price_min numeric(12,2),
  price_max numeric(12,2),
  price_note text,
  duration text,
  customers_served integer default 0,
  features jsonb default '[]'::jsonb,
  required_documents jsonb default '[]'::jsonb,
  status text default 'available',
  priority integer default 0,
  popular boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint services_status_check check (status in ('available', 'coming-soon', 'disabled')),
  constraint services_pricing_type_check check (pricing_type in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable'))
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null,
  service_id uuid references public.services(id) on delete set null,
  service_slug text not null,
  service_name text not null,
  category text,
  customer_name text not null,
  phone text not null,
  email text,
  notes text,
  base_amount numeric(12,2) default 0,
  gst_rate numeric(5,2) default 18,
  gst_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  pricing_type text not null default 'quote_required',
  currency text not null default 'INR',
  price_snapshot jsonb not null default '{}'::jsonb,
  checkout_token_hash text,
  checkout_token_expires_at timestamptz,
  request_status text default 'new',
  payment_status text default 'pending',
  assigned_to text,
  admin_notes text,
  source text default 'website',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint requests_request_status_check check (
    request_status in ('new', 'payment_pending', 'payment_completed', 'in_progress', 'completed', 'cancelled', 'failed')
  ),
  constraint requests_payment_status_check check (
    payment_status in ('pending', 'order_created', 'authorized', 'captured', 'failed', 'verification_failed', 'refunded', 'partially_refunded')
  ),
  constraint requests_pricing_type_check check (pricing_type in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable'))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  request_number text not null,
  service_name text not null,
  customer_name text,
  phone text,
  email text,
  base_amount numeric(12,2) default 0,
  gst_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  currency text default 'INR',
  provider text default 'manual',
  provider_order_id text,
  provider_payment_id text,
  provider_signature text,
  status text default 'pending',
  attempt_number integer not null default 1,
  idempotency_key text,
  method text,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint payments_status_check check (status in ('pending', 'order_created', 'authorized', 'captured', 'failed', 'verification_failed', 'refunded', 'partially_refunded'))
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text default 'razorpay',
  event_type text not null,
  request_number text,
  provider_order_id text,
  provider_payment_id text,
  event_key text unique,
  provider_event_id text,
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz default now()
);

create index if not exists services_slug_idx on public.services(slug);
create index if not exists services_category_slug_idx on public.services(category_slug);
create index if not exists services_status_idx on public.services(status);
create index if not exists services_priority_idx on public.services(priority);

create index if not exists requests_request_number_idx on public.requests(request_number);
create index if not exists requests_checkout_token_expires_at_idx on public.requests(checkout_token_expires_at);
create index if not exists requests_created_at_idx on public.requests(created_at);
create index if not exists requests_request_status_idx on public.requests(request_status);
create index if not exists requests_payment_status_idx on public.requests(payment_status);
create index if not exists requests_service_slug_idx on public.requests(service_slug);
create index if not exists requests_phone_idx on public.requests(phone);

create index if not exists payments_request_number_idx on public.payments(request_number);
create index if not exists payments_request_id_idx on public.payments(request_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_created_at_idx on public.payments(created_at);
create index if not exists payments_provider_order_id_idx on public.payments(provider_order_id);
create index if not exists payments_provider_payment_id_idx on public.payments(provider_payment_id);

create index if not exists payment_events_event_type_idx on public.payment_events(event_type);
create index if not exists payment_events_request_number_idx on public.payment_events(request_number);
create index if not exists payment_events_provider_order_id_idx on public.payment_events(provider_order_id);
create index if not exists payment_events_processed_idx on public.payment_events(processed);

create unique index if not exists payments_idempotency_key_unique on public.payments(idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_provider_order_id_unique on public.payments(provider_order_id) where provider_order_id is not null;
create unique index if not exists payments_provider_payment_id_unique on public.payments(provider_payment_id) where provider_payment_id is not null;
create unique index if not exists payment_events_provider_event_id_unique on public.payment_events(provider_event_id) where provider_event_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.services enable row level security;
alter table public.requests enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

comment on table public.services is 'Linkup Legal service catalog. Writes should go through the server API using the service role key.';
comment on table public.requests is 'Public and CRM service requests. Public clients must not write directly; use the server API.';
comment on table public.payments is 'Payment state and provider identifiers. Mutations must be server-side only.';
comment on table public.payment_events is 'Raw payment provider webhook events for audit/idempotency. Insert from trusted server webhook handlers only.';

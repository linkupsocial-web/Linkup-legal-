begin;

alter table public.services
  add column if not exists pricing_type text,
  add column if not exists price_min numeric(12,2),
  add column if not exists price_max numeric(12,2),
  add column if not exists price_note text;

update public.services
set pricing_type = case
  when coalesce(price, 0) > 0 then 'fixed'
  else 'quote_required'
end
where pricing_type is null or pricing_type not in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable');

alter table public.services
  alter column pricing_type set default 'quote_required',
  alter column pricing_type set not null;

alter table public.services drop constraint if exists services_pricing_type_check;
alter table public.services add constraint services_pricing_type_check check (
  pricing_type in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable')
);

alter table public.requests
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists pricing_type text,
  add column if not exists currency text,
  add column if not exists price_snapshot jsonb,
  add column if not exists checkout_token_hash text,
  add column if not exists checkout_token_expires_at timestamptz;

update public.requests
set request_status = case request_status
  when 'requested' then 'new'
  when 'visited' then 'in_progress'
  when 'pending' then 'in_progress'
  when 'paid' then 'payment_completed'
  else coalesce(request_status, 'new')
end;

update public.requests
set payment_status = case payment_status
  when 'partial' then 'authorized'
  when 'paid' then 'captured'
  else coalesce(payment_status, 'pending')
end;

update public.requests
set pricing_type = case
  when coalesce(total_amount, 0) > 0 then 'fixed'
  else 'quote_required'
end
where pricing_type is null or pricing_type not in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable');

update public.requests
set currency = 'INR'
where currency is null or btrim(currency) = '';

update public.requests
set price_snapshot = jsonb_build_object(
  'service_slug', service_slug,
  'service_name', service_name,
  'pricing_type', pricing_type,
  'base_amount', base_amount,
  'gst_rate', gst_rate,
  'gst_amount', gst_amount,
  'total_amount', total_amount,
  'currency', currency,
  'captured_at', coalesce(created_at, now())
)
where price_snapshot is null;

alter table public.requests
  alter column pricing_type set not null,
  alter column currency set default 'INR',
  alter column currency set not null,
  alter column price_snapshot set default '{}'::jsonb,
  alter column price_snapshot set not null;

alter table public.requests drop constraint if exists requests_request_status_check;
alter table public.requests add constraint requests_request_status_check check (
  request_status in ('new', 'payment_pending', 'payment_completed', 'in_progress', 'completed', 'cancelled', 'failed')
);
alter table public.requests drop constraint if exists requests_payment_status_check;
alter table public.requests add constraint requests_payment_status_check check (
  payment_status in ('pending', 'order_created', 'authorized', 'captured', 'failed', 'verification_failed', 'refunded', 'partially_refunded')
);
alter table public.requests drop constraint if exists requests_pricing_type_check;
alter table public.requests add constraint requests_pricing_type_check check (
  pricing_type in ('fixed', 'starting_from', 'range', 'quote_required', 'not_applicable')
);

alter table public.payments
  add column if not exists attempt_number integer,
  add column if not exists idempotency_key text;

update public.payments
set status = case status
  when 'partial' then 'authorized'
  when 'paid' then 'captured'
  else coalesce(status, 'pending')
end;

update public.payments
set attempt_number = 1
where attempt_number is null or attempt_number < 1;

alter table public.payments
  alter column attempt_number set default 1,
  alter column attempt_number set not null;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (
  status in ('pending', 'order_created', 'authorized', 'captured', 'failed', 'verification_failed', 'refunded', 'partially_refunded')
);

alter table public.payment_events
  add column if not exists provider_event_id text,
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;

update public.payment_events
set provider_event_id = concat(provider, ':legacy:', id::text)
where provider_event_id is null or btrim(provider_event_id) = '';

create unique index if not exists payments_idempotency_key_unique
  on public.payments (idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_provider_order_id_unique
  on public.payments (provider_order_id) where provider_order_id is not null;
create unique index if not exists payments_provider_payment_id_unique
  on public.payments (provider_payment_id) where provider_payment_id is not null;
create unique index if not exists payment_events_provider_event_id_unique
  on public.payment_events (provider_event_id) where provider_event_id is not null;

create index if not exists requests_checkout_token_expires_at_idx on public.requests(checkout_token_expires_at);
create index if not exists payments_request_id_idx on public.payments(request_id);
create index if not exists payment_events_provider_order_id_idx on public.payment_events(provider_order_id);
create index if not exists payment_events_processed_idx on public.payment_events(processed);

create or replace function public.claim_razorpay_payment_attempt(
  p_request_number text,
  p_idempotency_key text
)
returns table (
  payment_id uuid,
  provider_order_id text,
  amount numeric,
  currency text,
  payment_status text,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_payment public.payments%rowtype;
  v_attempt integer;
begin
  select * into v_request
  from public.requests
  where request_number = p_request_number
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'REQUEST_NOT_FOUND';
  end if;

  if v_request.pricing_type <> 'fixed' or coalesce(v_request.total_amount, 0) <= 0 then
    raise exception using errcode = 'P0001', message = 'QUOTE_REQUIRED';
  end if;

  if v_request.payment_status in ('captured', 'refunded', 'partially_refunded') then
    raise exception using errcode = 'P0001', message = 'PAYMENT_ALREADY_FINAL';
  end if;

  select * into v_payment
  from public.payments
  where request_id = v_request.id
    and provider = 'razorpay'
    and status in ('pending', 'order_created', 'authorized')
  order by created_at desc
  limit 1
  for update;

  if found then
    return query select v_payment.id, v_payment.provider_order_id, v_payment.total_amount,
      coalesce(v_payment.currency, 'INR'), v_payment.status, false;
    return;
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.payments
  where request_id = v_request.id and provider = 'razorpay';

  insert into public.payments (
    request_id, request_number, service_name, customer_name, phone, email,
    base_amount, gst_amount, total_amount, currency, provider, status,
    attempt_number, idempotency_key
  ) values (
    v_request.id, v_request.request_number, v_request.service_name, v_request.customer_name,
    v_request.phone, v_request.email, v_request.base_amount, v_request.gst_amount,
    v_request.total_amount, v_request.currency, 'razorpay', 'pending', v_attempt, p_idempotency_key
  ) returning * into v_payment;

  update public.requests
  set request_status = 'payment_pending', payment_status = 'pending'
  where id = v_request.id;

  return query select v_payment.id, null::text, v_payment.total_amount,
    coalesce(v_payment.currency, 'INR'), v_payment.status, true;
end;
$$;

create or replace function public.attach_razorpay_order(
  p_payment_id uuid,
  p_provider_order_id text
)
returns table (payment_id uuid, provider_order_id text, amount numeric, currency text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  update public.payments
  set provider_order_id = p_provider_order_id, status = 'order_created', failure_reason = null
  where id = p_payment_id and provider = 'razorpay' and status = 'pending' and provider_order_id is null
  returning * into v_payment;

  if not found then
    raise exception using errcode = 'P0001', message = 'PAYMENT_ATTEMPT_NOT_ATTACHABLE';
  end if;

  update public.requests
  set request_status = 'payment_pending', payment_status = 'order_created'
  where id = v_payment.request_id;

  return query select v_payment.id, v_payment.provider_order_id, v_payment.total_amount,
    coalesce(v_payment.currency, 'INR');
end;
$$;

create or replace function public.fail_razorpay_payment_attempt(
  p_payment_id uuid,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id and provider = 'razorpay'
  for update;

  if not found or v_payment.provider_order_id is not null then
    return;
  end if;

  update public.payments
  set status = 'failed', failure_reason = left(p_failure_reason, 200)
  where id = v_payment.id and status = 'pending';

  update public.requests
  set request_status = 'failed', payment_status = 'failed'
  where id = v_payment.request_id;
end;
$$;

create or replace function public.finalize_razorpay_payment(
  p_provider_order_id text,
  p_provider_payment_id text,
  p_provider_signature text,
  p_status text,
  p_method text default null,
  p_failure_reason text default null
)
returns table (payment_id uuid, request_number text, payment_status text, request_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_request_status text;
begin
  if p_status not in ('authorized', 'captured', 'failed', 'verification_failed', 'refunded', 'partially_refunded') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_STATUS';
  end if;

  select * into v_payment
  from public.payments
  where provider = 'razorpay' and provider_order_id = p_provider_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND';
  end if;

  if v_payment.status in ('captured', 'refunded', 'partially_refunded') then
    return query select v_payment.id, v_payment.request_number, v_payment.status,
      (select request_status from public.requests where id = v_payment.request_id);
    return;
  end if;

  v_request_status := case p_status
    when 'captured' then 'payment_completed'
    when 'authorized' then 'payment_pending'
    when 'failed' then 'failed'
    when 'verification_failed' then 'failed'
    else 'payment_completed'
  end;

  update public.payments
  set status = p_status,
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      provider_signature = coalesce(p_provider_signature, provider_signature),
      method = coalesce(nullif(btrim(p_method), ''), method),
      paid_at = case when p_status = 'captured' then coalesce(paid_at, now()) else paid_at end,
      failure_reason = case when p_status in ('failed', 'verification_failed') then p_failure_reason else null end
  where id = v_payment.id
  returning * into v_payment;

  update public.requests
  set request_status = v_request_status, payment_status = p_status
  where id = v_payment.request_id;

  return query select v_payment.id, v_payment.request_number, v_payment.status, v_request_status;
end;
$$;

create or replace function public.record_razorpay_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_request_number text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_payload jsonb,
  p_payment_status text default null,
  p_method text default null
)
returns table (id uuid, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.payment_events%rowtype;
begin
  insert into public.payment_events (
    provider, provider_event_id, event_type, request_number, provider_order_id,
    provider_payment_id, event_key, payload, processed
  ) values (
    'razorpay', p_provider_event_id, p_event_type, p_request_number, p_provider_order_id,
    p_provider_payment_id, p_provider_event_id, p_payload, false
  ) on conflict do nothing
  returning * into v_event;

  if not found then
    select * into v_event from public.payment_events where provider_event_id = p_provider_event_id;
    return query select v_event.id, true;
    return;
  end if;

  if p_payment_status is not null and p_provider_order_id is not null then
    perform public.finalize_razorpay_payment(
      p_provider_order_id,
      p_provider_payment_id,
      null,
      p_payment_status,
      p_method,
      case when p_payment_status = 'failed' then 'Razorpay reported a failed payment.' else null end
    );
  end if;

  update public.payment_events
  set processed = true, processed_at = now(), processing_error = null
  where id = v_event.id;

  return query select v_event.id, false;
exception when others then
  if v_event.id is not null then
    update public.payment_events
    set processing_error = left(sqlerrm, 200)
    where id = v_event.id;
  end if;
  raise;
end;
$$;

revoke all on function public.claim_razorpay_payment_attempt(text, text) from public;
revoke all on function public.attach_razorpay_order(uuid, text) from public;
revoke all on function public.fail_razorpay_payment_attempt(uuid, text) from public;
revoke all on function public.finalize_razorpay_payment(text, text, text, text, text, text) from public;
revoke all on function public.record_razorpay_webhook_event(text, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.claim_razorpay_payment_attempt(text, text) to service_role;
grant execute on function public.attach_razorpay_order(uuid, text) to service_role;
grant execute on function public.fail_razorpay_payment_attempt(uuid, text) to service_role;
grant execute on function public.finalize_razorpay_payment(text, text, text, text, text, text) to service_role;
grant execute on function public.record_razorpay_webhook_event(text, text, text, text, text, jsonb, text, text) to service_role;

commit;

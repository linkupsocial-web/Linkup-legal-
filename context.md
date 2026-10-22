   

# LinkUp Legal: Current Technical Context

> **Audit status:** source-verified repository audit. Live application code, configuration, checked-in SQL, and local production-mode HTTP measurements are the source of truth. This replaces stale statements from the prior context. It is not proof of the current hosted Supabase schema, Razorpay configuration, browser-extension state, or production traffic.
>
> **Audit metadata:** 2026-08-03, Windows workspace `C:\Users\Lenovo\Linkup_legal`, Node `v24.14.0`, npm `11.9.0`, Next build runtime `15.5.20`. The installed package range is Next `^15.1.0`, React `^18.3.1`, and TypeScript `^5.8.3`. Browser automation was unavailable, so Chrome rendering/hydration measurements were not performed. No `.env` values, database records, leads, or payments were read or changed.

## 1. Purpose, Users, and Current State

LinkUp Legal is a public service catalogue for business/legal/compliance services with a private CRM for managing service requests, services, and payments. Public visitors browse services, submit a protected lead form, and can pay a fixed-price request through a tokenized checkout link when Supabase and Razorpay are configured. Quote-required services create a request but do not expose online payment. CRM users are `admin` or assigned `agent` users.

The current public catalogue is **Supabase-only**. It no longer uses the Google Sheets/static service catalogue fallback. CRM data stores still contain Google Sheets and non-production memory fallback paths; those apply to CRM/request/payment continuity, not public catalogue rendering. Public request submission never opens WhatsApp automatically: only a confirmed Supabase-backed payable request receives a validated internal checkout URL. Non-payable or fallback requests remain on the detail page and display the server response message.

## 2. Commands and Delivery Assumptions

| Command                                | Purpose                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run dev`                        | Next development server using Turbopack.                                                            |
| `npm run build`                      | Production build.                                                                                   |
| `npm run start`                      | Serve a prior production build.                                                                     |
| `npm run lint`                       | ESLint over the repository.                                                                         |
| `npm run typecheck`                  | `tsc --noEmit`.                                                                                   |
| `npm run test`                       | Custom Node runner: compiles`*.test.ts` to a temporary CommonJS directory and executes each file. |
| `npm run sync:service-content`       | Updates already-existing Supabase service image/features/required-documents data by slug.           |
| `npm run sync:services` / `:watch` | Legacy Google Sheet service sync script; not used by the public runtime catalogue.                  |

CI at `.github/workflows/ci.yml` uses Node 20 and runs `npm ci`, lint, typecheck, test, and build for push/PR. Hosting is assumed to provide a Node-capable Next runtime, publicly reachable Razorpay webhook URL, and configured server environment variables. There is no checked-in deployment configuration.

## 3. Technology Stack

| Area                | Verified implementation                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework/rendering | Next.js App Router, TypeScript strict mode, React 18, server components by default, client components where marked, Turbopack for development.                                                       |
| Styling             | Tailwind CSS 3,`tailwindcss-animate`, CSS variables/shadcn-style primitives, `class-variance-authority`, `clsx`, `tailwind-merge`.                                                           |
| UI                  | Used primitives are Button, Card, Dialog, Input, Label, Separator, Sheet, Skeleton, Textarea, Toast, Toggle, Tooltip; Lucide icons.                                                                  |
| Backend/storage     | Supabase JavaScript client with a server/service-role client. Server-side repositories own catalog/request/payment access.                                                                           |
| Payments            | Razorpay REST API, checkout script loaded on user payment intent, HMAC verification, Supabase RPC-backed idempotency/reconciliation.                                                                 |
| Abuse control       | hCaptcha client widget and server verification; local process-memory rate limiter.                                                                                                                   |
| CRM                 | Iron Session cookie session, environment-defined admin/agent credentials, role helpers, CRM tables and server API routes.                                                                            |
| Integrations        | Google Sheets legacy stores/mirroring, Google APIs, Meta Pixel, Meta Conversions API, optional Google Analytics and WhatsApp widget, Google Translate public endpoint for Hindi runtime translation. |
| Data/UI tooling     | Papa Parse CSV import/export, Recharts for CRM payment trend,`libphonenumber-js` for Indian phone normalization.                                                                                   |
| Tests               | Plain Node assertions in`*.test.ts`, compiled/run by `scripts/run-node-tests.mjs`; Vitest is installed but source usage was not found.                                                           |

Installed packages such as React Query, React Hook Form, Zod, Sonner, CMDK, Embla, Next Themes, React Day Picker, Vaul, and many Radix primitives are present in `package.json`; this audit does not mark them removable. Their runtime necessity should be established by a focused import/dependency audit before changing them. `@next/bundle-analyzer` is conditionally required by `next.config.ts` when `ANALYZE=true`, but it is not declared in the manifest; the config intentionally degrades to a no-op if unavailable.

## 4. Meaningful Repository Structure

```text
.
├─ .github/workflows/ci.yml                 CI verification
├─ docs/
│  ├─ supabase-schema.sql                   expected full schema
│  ├─ supabase-migrations/                  manual database migrations
│  └─ src-file-map.md                       older file map; some statements are stale
├─ public/
│  ├─ services/                             local service image assets/placeholders
│  └─ logos/icons and static site assets
├─ scripts/
│  ├─ run-node-tests.mjs                    custom test runner
│  ├─ service-content.mjs                   canonical content data for sync
│  ├─ update-supabase-service-content.mjs   Supabase content updater
│  └─ sync-services-from-sheet.mjs          legacy sheet sync
├─ src/
│  ├─ app/                                  App Router pages, layouts, route handlers
│  ├─ components/                           UI grouped by analytics, CRM, home, layout, services, ui
│  ├─ context/                              Language provider
│  ├─ data/                                 legacy/static category definitions; service list is empty
│  ├─ hooks/                                mobile/toast hooks
│  ├─ i18n/                                 translation data/runtime translation helpers
│  ├─ lib/                                  shared domain helpers, legacy CRM stores, Supabase clients
│  ├─ server/                               server-only services, rate limit, providers, repositories
│  └─ types/                                public service/request related types
├─ components.json, tailwind.config.ts, postcss.config.js
├─ eslint.config.mjs, tsconfig.json, next.config.ts
├─ package.json, package-lock.json, README.md
└─ context.md                               this audit
```

`src/app` owns HTTP boundaries and route rendering. `src/server` owns service orchestration and Supabase repositories. `src/lib` contains shared normalization/security helpers and the legacy CRM sheet/memory stores. Server-only modules use `server-only` where applicable. Do not import service-role code into a client component.

## 5. Architecture and Rendering Model

* Root `src/app/layout.tsx` loads DM Sans and Space Grotesk with `next/font`, providers, analytics, optional WhatsApp script, and global metadata. It does **not** set `suppressHydrationWarning`.
* `/` is `force-static`; it gets homepage categories and lazy-loads below-the-fold home sections. Its output is ISR-revalidated after 60 seconds through the catalogue data path.
* `/services`, service category pages, and service details use the current Supabase catalogue and 60-second revalidation. Service detail paths are generated/revalidated from current public services.
* Checkout is `force-dynamic` and `revalidate = 0`; it validates a request number and opaque checkout token server-side and displays masked PII.
* CRM dashboard pages are server-gated by session layout, then use client components for interactive lists/charts. API responses are fetched at runtime; no Supabase Realtime channel/subscription is implemented.
* Payment, lead, CRM, and webhook route handlers are dynamic. Payment routes declare the Node runtime.

## 6. Public Pages

| URL                               | Source                                                                       | Model/data                                                       | Behaviour                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/`                             | `src/app/page.tsx`                                                         | static/ISR;`getHomepageServiceCategories`                      | Hero, categories, lazy home sections, Organization/WebSite JSON-LD.                                                   |
| `/services`                     | `src/app/services/page.tsx`, `ServicesClient.tsx`                        | ISR shell plus client search/pagination through`/api/services` | Public service browse/search; loading UI at`services/loading.tsx`.                                                  |
| `/services/category/[category]` | `src/app/services/category/[category]/page.tsx`                            | ISR Supabase public services                                     | Category landing; invalid category resolves to not found.                                                             |
| `/services/[slug]`              | `src/app/services/[slug]/page.tsx`, `ServiceDetailClient.tsx`            | ISR Supabase public service                                      | Detail metadata, request form, hCaptcha, optional checkout redirect.`loading.tsx` supplies skeleton.                |
| `/checkout/[requestNumber]`     | `src/app/checkout/[requestNumber]/page.tsx`, `CheckoutPaymentAction.tsx` | dynamic/no-store token-protected request                         | Noindex metadata, masks PII, creates/verifies Razorpay payment after user intent; invalid/expired token is not found. |
| framework routes                  | `loading.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`            | framework/server                                                 | Global fallback, crawler rules, dynamic public service/category sitemap.                                              |

`Layout.tsx` supplies public layout/Navbar/Footer and mounts the WhatsApp float on normal public pages, including service details. Checkout also currently mounts the shared layout float; CRM/login do not use this layout. The float returns `null` only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is unavailable. The local audit environment has a configured number (value not recorded). `Navbar.tsx` has debounced, abortable `/api/services?scope=suggestions` search and a module-level suggestion cache. Public status filtering is `available` only: `coming-soon` and `disabled` do not enter public cards/pages/categories.

## 7. CRM Pages and Authorization

| URL                                | Source                             | Role/API dependencies                        | Client behaviour                                                                                |
| ---------------------------------- | ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/crm/login`                     | `src/app/crm/login/page.tsx`     | public login endpoint                        | Establishes Iron Session on success.                                                            |
| `/crm/dashboard`                 | `src/app/crm/dashboard/page.tsx` | authenticated; request/payment/service stats | Dashboard cards; polls aggregate stats every 120 seconds only while document is visible.        |
| `/crm/dashboard/allrequest`      | `.../allrequest/page.tsx`        | authenticated; requests APIs                 | Admin can add; agents see assigned data/redacted PII; filters/search/pagination/manual refresh. |
| `/crm/dashboard/payments`        | `.../payments/page.tsx`          | admin only; payments APIs                    | Stats, Recharts trend, filters/search/table.                                                    |
| `/crm/dashboard/active-services` | `.../active-services/page.tsx`   | admin only; services APIs                    | Service CRUD and CSV import/export.                                                             |

`src/app/crm/dashboard/layout.tsx` is the protected server boundary. `CrmAuthProvider`, `CrmDashboardShell`, `CrmRequestsTable`, `CrmPaymentsTable`, and `CrmServicesTable` provide client UI. There is no realtime subscription; refresh is polling/user initiated.

## 8. API Inventory

| Route                          | Methods/access                  | Primary behaviour, storage, key controls                                                                                                                                                                                             |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/services`              | GET public                      | Public Supabase catalogue/search/suggestions only; service cache 60 s and API cache headers for suggestions. Returns`503` when catalogue storage is unavailable rather than falling back to Sheets/static data.                    |
| `/api/leads`                 | POST public                     | Validates body/phone/service, verifies hCaptcha, fetches public service, snapshots server-side pricing/GST, creates request, schedules non-critical Meta CAPI and conditional Sheets fallback. Per-process 8/min IP limit; no-store. |
| `/api/submit-request`        | POST public legacy              | Directly calls legacy`crm-store.addRequest`; basic required field validation, no hCaptcha/rate limiting. It remains callable but is not the current detail-form flow.                                                              |
| `/api/payments/create-order` | POST public with checkout token | Validates request/token, eligibility and final status; 10/min IP limit; claims idempotent attempt through Supabase RPC, creates/reconciles Razorpay order, persists order ID.                                                        |
| `/api/payments/verify`       | POST public with checkout token | Validates callback fields, HMAC, provider payment/order/amount/currency/status, then finalizes with Supabase RPC. 10/min IP limit.                                                                                                   |
| `/api/payments/webhook`      | POST Razorpay                   | Reads raw body, verifies webhook HMAC/event ID, reconciles amount/currency, deduplicates/persists/updates state through Supabase RPC. Requires Supabase and webhook secret.                                                          |
| `/api/crm/auth`              | GET/POST/DELETE                 | Session inspection/login/logout. Login uses process-memory failed-attempt limit (5 per 10 min by IP+username).                                                                                                                       |
| `/api/crm/requests`          | GET/POST authenticated          | Paginated/filterable list; agent assignment scoping/redaction; admin creation.                                                                                                                                                       |
| `/api/crm/requests/[id]`     | PATCH authenticated             | Agents may update own assigned request status/note; admin can assign/update.                                                                                                                                                         |
| `/api/crm/payments`          | GET/POST authenticated          | Paginated stats/list and admin manual payment creation.                                                                                                                                                                              |
| `/api/crm/payments/[id]`     | PATCH authenticated             | Admin payment update.                                                                                                                                                                                                                |
| `/api/crm/services`          | GET/POST admin                  | CRM catalog list/stats and service create. CRM repository retains legacy fallback when Supabase is unavailable.                                                                                                                      |
| `/api/crm/services/[id]`     | PATCH/DELETE admin              | CRM service update/delete.                                                                                                                                                                                                           |
| `/api/crm/services/import`   | POST admin                      | Papa Parse CSV validation/import.                                                                                                                                                                                                    |
| `/api/crm/services/export`   | GET admin                       | CSV export.                                                                                                                                                                                                                          |

CRM route handlers return role-appropriate `401`/`403`; the exact JSON fields vary by handler. Do not make client integrations depend on undocumented error text. Public payment errors include `PAYMENT_UNAVAILABLE`, `INVALID_REQUEST`, `INVALID_CHECKOUT_TOKEN`, `QUOTE_REQUIRED`, `PAYMENT_IN_PROGRESS`, reconciliation errors, and rate-limit errors.

## 9. Component Inventory

| Area                | Files                                                                                                                                                                          | Role and important side effects                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Providers/analytics | `GoogleAnalyticsProvider.tsx`, `MetaPixelProvider.tsx`, Language provider                                                                                                  | Both analytics providers defer loading about five seconds then idle time. Meta tracks page views/events; language starts in English then reads local storage and can request translated strings. |
| Home                | `HeroSection`, `StatsSection`, `PopularServicesSection`, `HowItWorksSection`, `TrustSection`, `GoogleReviewSection`, `CtaSection`, `TrackedServicesBrowseLink` | Hero stats use one-shot IntersectionObserver count-up (1.4s) and honour reduced motion. Below-fold sections are dynamically imported from the page.                                              |
| Layout              | `Layout`, `Navbar`, `Footer`, `WhatsAppFloatButton`, `NavbarSuggestionIcon`, `RouteTransitionLoader`                                                               | Navbar debounce/abort/cache search.`RouteTransitionLoader` exists but is not mounted by the public layout. WhatsApp widget/float are configuration-dependent.                                  |
| Services            | `ServiceCard`, `ServiceVisual`, `ComboBadge`, `service-icons`                                                                                                          | Cards are client components for translated content/tracking. Service visual uses local/remote approved imagery.                                                                                  |
| Detail/checkout     | `ServiceDetailClient`, `CheckoutPaymentAction`                                                                                                                             | Detail form owns local form/hCaptcha/toast state. Checkout action loads Razorpay checkout script only after payment intent.                                                                      |
| CRM                 | `CrmAuthProvider`, `CrmDashboardShell`, three CRM tables                                                                                                                   | Fetch/refresh/filter state, responsive table controls, CSV download/import flows.                                                                                                                |
| UI                  | `src/components/ui/*`                                                                                                                                                        | Shared primitive wrappers; only edit with an impact review because they are reused.                                                                                                              |

## 10. Service Catalogue and Content Flow

```text
Supabase services table
  -> services.supabase.repository.ts (row mapper / service role)
  -> services.datasource.ts (unstable_cache, 60 s, tag: services)
  -> services.repository.ts / services.service.ts (category/search/public filter)
  -> public pages and /api/services
  -> cards, categories, service details
```

`ServiceStatus` normalizes legacy `active` to canonical `available`; valid current status values are `available`, `coming-soon`, and `disabled`. CRM list/CRUD includes all statuses. Public visibility explicitly permits only `available`, so disabled rows remain administratively visible but are absent from public lists/detail generation. `services` data supports image, `features`, and `required_documents`; the content sync script only updates those matching existing slugs, not full service creation/pricing/status.

Failures: missing service-role Supabase configuration or a Supabase read error throws `ServiceCatalogUnavailableError`; public catalogue endpoints/pages do not fall back to Google Sheets/static services. CRM service operations may use their legacy fallback. Mutations revalidate the `services` cache tag, while direct content script changes have no explicit app revalidation call and can remain stale for the 60-second cache window (or deployment/runtime cache behavior).

## 11. Lead, Captcha, Checkout, Payment, and Webhook Flows

### Lead/request

1. `ServiceDetailClient` validates basic fields, captures hCaptcha token, and POSTs to `/api/leads`.
2. `lead.service.ts` validates fields, normalizes Indian phone number, verifies hCaptcha with a 3-second abort timeout, resolves the public Supabase service, and calculates a server-owned price/GST snapshot.
3. A `LL-...` request number and hashed, expiring checkout token are generated. The request is inserted through `requests.supabase.repository.ts`.
4. On Supabase request persistence failure, storage policy may use configured Google Sheets; in non-production it can use process memory. In production, if neither Supabase nor Sheets is available, the lead fails. A deferred fallback never receives a checkout token or online-payment authority. Schema failures return `PAYMENT_STORE_SCHEMA_MISMATCH`; other persistence failure fallback returns `PAYMENT_STORE_UNAVAILABLE`.
5. The client accepts checkout navigation only when `paymentAvailable` is true and the returned URL is a same-origin `/checkout/LL-...` path with a valid opaque token. Quote-required Supabase requests return `QUOTE_REQUIRED`; neither case opens WhatsApp automatically. Meta CAPI and deferred Sheets work are scheduled with Next `after` and emit non-PII duration logs.

### Captcha

The client renders hCaptcha only when `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is present. Server verification requires `HCAPTCHA_SECRET_KEY` in production and fails closed when missing; non-production may skip server verification with a warning when secret is absent. **Configuration risk:** without the public site key the client submission is disabled even where non-production server verification would permit it. Configure both keys together.

### Checkout and Razorpay

1. `/checkout/[requestNumber]?token=...` checks request-number format and opaque token hash/expiry. It masks email/phone and computes a `CheckoutPaymentState`.
2. Only `fixed` positive-price services are payable; `starting_from`, `range`, `quote_required`, and `not_applicable` show price confirmation instead.
3. `Pay Now` POSTs request number/token to create-order. Server claims a Supabase RPC attempt with a UUID idempotency key, reuses an existing order when available, calls Razorpay with a 4.5-second abort timeout, reconciles amount/currency, then attaches order ID.
4. Browser callback POSTs IDs/signature/token to verify. Server timing-safely validates local HMAC, fetches Razorpay payment, reconciles payment/order/amount/currency/status, and calls the atomic finalize RPC.
5. Razorpay webhook independently verifies raw payload HMAC and event ID; `payment_events.provider_event_id` deduplicates events, and an RPC updates payment/request status. The route rejects configuration/signature/payload/reconciliation errors and avoids logging raw payload or credentials.

## 12. Supabase Schema and Storage Expectations

The following is the checked-in target schema from `docs/supabase-schema.sql` plus manual migration `docs/supabase-migrations/20260801_request_payment_hardening.sql`. A read-only service-role projection was run on 2026-08-03 without customer rows or values. It found that the live database is missing `requests.service_id`, `requests.pricing_type`, `requests.currency`, `requests.price_snapshot`, `requests.checkout_token_hash`, `requests.checkout_token_expires_at`, and `services.pricing_type`; `requests.request_status` and `requests.payment_status` exist. This proves the hardening migration has not been applied to that database. It is not only a stale PostgREST cache.

| Table              | Purpose / key columns                                                                                                                                                                                      | Constraints and storage access                                                                                                                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services`       | UUID id, unique slug, title/description/category/category_slug, icon/image, price/pricing fields, duration/customers/documents/features, status, priority, timestamps                                      | Status check includes`available`, `coming-soon`, `disabled`; pricing check includes fixed/starting_from/range/quote_required/not_applicable. Indexes cover slug, category, status, priority. RLS enabled; no policies are declared in checked-in schema. Server service role performs access. |
| `requests`       | UUID id, unique request_number, optional service FK, customer/contact/notes, money/GST, pricing/currency/snapshot, checkout token hash/expiry, request/payment statuses, assignment/admin notes/timestamps | FK to services set null; request and payment status checks; indexes for request number, token expiry, timestamps/status/service/phone. RLS enabled.                                                                                                                                                 |
| `payments`       | UUID id, request FK/number and immutable-looking customer/service/money snapshot, provider IDs/signature/status, attempt/idempotency/method/timestamps/failure                                             | Unique partial indexes on idempotency key, Razorpay order ID, payment ID; indexes for request/status/time/provider IDs. RLS enabled.                                                                                                                                                                |
| `payment_events` | webhook provider/event/request/order/payment IDs, event key, JSON payload, processing state/errors                                                                                                         | Unique provider-event ID index and event indexes. RLS enabled.                                                                                                                                                                                                                                      |

The hardening migration adds/normalizes `services.pricing_type`, `price_min`, `price_max`, `price_note`; request pricing/token fields; payment `attempt_number`/`idempotency_key`; and payment-event processing fields. It maps legacy request status `requested` to `new` and legacy payment status `paid` to `captured`. It also creates security-definer RPCs for claim/attach/fail/finalize/record workflows, sets `search_path = public`, revokes public execution, and grants only `service_role` execution.

Supabase browser client creation exists in `src/lib/supabase/client.ts`, but no source import/use of a Realtime `channel`/`subscribe` path was found. RLS policy behavior cannot be verified from the SQL because policies are not declared there and service-role access bypasses RLS.

### Schema drift / PGRST204

The failing insert in `createSupabasePublicRequest` includes `service_id` first. The supplied runtime `PGRST204` is therefore the PostgREST schema-cache form of the verified missing `requests.service_id` column. Direct read-only validation returned PostgreSQL `42703: column requests.service_id does not exist`, and also identified the additional missing request/service fields listed above. The payload field names exactly match the checked-in schema and `20260801_request_payment_hardening.sql`; they are not misspelled. Apply that existing migration once, then run `docs/supabase-migrations/20260803_reload_postgrest_schema.sql` to issue `NOTIFY pgrst, 'reload schema'` and list `information_schema.columns`. Do not apply the new script as a substitute for the hardening migration.

## 13. CRM Data and Authentication Flow

`src/lib/crm-auth.ts` derives agents from environment values and optional `CRM_AGENTS_JSON`; `crm-session.ts` uses Iron Session with an 8-hour, `httpOnly`, `SameSite=Lax`, production-secure cookie. Dashboard layout enforces a session. Admin has services/payment authority; agents are scoped to assigned requests and receive redacted request views. CRM repositories prefer Supabase, while `crm-store.ts`, `crm-payments-store.ts`, and `crm-services-store.ts` retain Google Sheets/memory fallback paths with cached sheet metadata/header lookup.

Credentials are environment plaintext comparisons rather than a user database/password hash flow. This is a production security/design limitation, not a claim that any credential value is weak. Session secret validation rejects known defaults and requires sufficient length. Login failed-attempt limiting and all payment/lead limits are process-local `Map` state, so they do not coordinate across instances and reset on restart.

## 14. External Integrations

| Integration      | Files / mode                                                                                     | Failure and latency characteristics                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase         | `src/lib/supabase/*`, `src/server/repositories/*` server-service role; browser client unused | Public catalogue fails closed with 503. Request CRM fallback depends on policy. No query-level timing fields were found.                                              |
| Razorpay         | `razorpay.service.ts`, payment API routes, checkout action                                     | Server calls use 4.5 s AbortController timeout. Order/verify/webhook are configuration-dependent and were not exercised to avoid payment/provider side effects.       |
| hCaptcha         | detail client,`captcha.service.ts`                                                             | Client widget; server verify URL HTTPS only, default provider URL, 3 s timeout. Production missing secret fails closed.                                               |
| Google Sheets    | legacy CRM stores,`google-leads-sheet.service.ts`                                              | Still active as a possible CRM/request fallback/mirror; not used as public catalogue source. Requires service credentials/sheet IDs; exact live readiness not tested. |
| Meta Pixel/CAPI  | client analytics +`meta-conversions.service.ts`                                                | Pixel is client deferred; CAPI is scheduled after response. Optional token/test code.                                                                                 |
| GA               | `GoogleAnalyticsProvider.tsx`                                                                  | Optional client script delayed/idle.                                                                                                                                  |
| WhatsApp         | Navbar/layout/contact helpers                                                                    | Optional widget script and float; contact link exists. No automatic request-form browser opening.                                                                     |
| Google Translate | i18n runtime helper                                                                              | Client fetches public Google Translate endpoint in batches with in-memory/local-storage caching; availability/latency not measured.                                   |
| Remote images    | Next image remote patterns                                                                       | Only Unsplash, Cloudinary, and Googleusercontent HTTPS hosts are approved.                                                                                            |

## 15. Environment Variables (Names Only)

| Group                      | Variables                                                                                                                                                                                                                                                                                                     | Required behavior / exposure                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Site/contact public        | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CALL_NUMBER`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`                                                                                                                                                                                         | Public compile-time values; missing site URL uses local/production fallback in URL helpers.                          |
| Supabase                   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                                                                                                                | URL/anon key are intentionally public; service role is server-only and enables authoritative storage.                |
| hCaptcha                   | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET_KEY`, `HCAPTCHA_VERIFY_URL`                                                                                                                                                                                                                           | Public widget key vs server secret; production needs server secret.                                                  |
| Razorpay                   | `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                                                                                                                                                                                                    | Public ID must equal configured server ID for checkout; secret/webhook secret server-only.                           |
| CRM                        | `CRM_ADMIN_USER`, `CRM_ADMIN_PASS`, `CRM_ADMIN_NAME`, `CRM_AGENT_USER`, `CRM_AGENT_PASS`, `CRM_AGENT_NAME`, `CRM_AGENT2_USER`, `CRM_AGENT2_PASS`, `CRM_AGENT2_NAME`, `CRM_AGENTS_JSON`, `CRM_SESSION_SECRET`                                                                            | Server-only; required to activate CRM auth. These are used in code but absent from`.env.example`.                  |
| Google CRM/request storage | `GOOGLE_LEADS_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_LEADS_PRIVATE_KEY`, `GOOGLE_LEADS_SHEET_ID`, `GOOGLE_LEADS_SHEET_GID`, `GOOGLE_LEADS_SHEET_NAME`, `GOOGLE_LEADS_SHEET_RANGE`; analogous `GOOGLE_PAYMENTS_*`; generic `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_*` | Server-only integration/fallback configuration. Some name/range values used by code are absent from`.env.example`. |
| Analytics/widgets          | `NEXT_PUBLIC_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`, `META_GRAPH_API_VERSION`, `META_TEST_EVENT_CODE`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_WHATSAPP_WIDGET_SRC`                                                                                                            | Public IDs/scripts versus server-only Meta token. All optional.                                                      |
| Build/runtime              | `NODE_ENV`, `ANALYZE`                                                                                                                                                                                                                                                                                     | `ANALYZE=true` attempts optional analyzer load.                                                                    |

`.env.example` contains `GOOGLE_LEADS_WEBHOOK_URL` and `NEXT_PUBLIC_GOOGLE_SHEET_URL`, but no live source usage was found for either. Do not expose any server secret through `NEXT_PUBLIC_*` variables.

## 16. Caching, Data Freshness, and Realtime

| Surface               | Verified behavior                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Service catalogue     | `unstable_cache` 60 seconds, tag `services`; service mutations call `revalidateTag`.                                                                   |
| Public routes         | Home/services/category/detail use ISR-ish 60-second service data behavior; catalogue absence/error is not silently served from stale Google/static fallback. |
| Suggestions           | Navbar client cache plus server`s-maxage=60`, `stale-while-revalidate=86400` for suggestion requests.                                                    |
| Payment/lead/CRM APIs | Dynamic/no-store or request-time protected access.                                                                                                           |
| Checkout              | Dynamic,`revalidate=0`, token-specific.                                                                                                                    |
| Static assets         | Image/font-like listed extensions have one-year immutable cache header; favicon/icon revalidate.                                                             |
| CRM                   | Dashboard polls stats every 120 seconds when visible; no Supabase realtime.                                                                                  |

Likely freshness consideration: direct script updates to service content do not call Next tag revalidation, so cached public views can lag until cache expiry/restart. Payment status in open checkout is request-time server data; CRM may lag until its next fetch/poll/manual refresh.

## 17. Performance Measurements and Bundle Evidence

### Production build

`npm run build` succeeded on 2026-08-03: compilation completed in **21.1 s** and Next generated **57 static pages**. Selected build output: `/` 11.8 kB page / 144 kB first-load JS; `/services` 142 kB; `/services/[slug]` 49.8 kB page / 187 kB first-load JS; `/checkout/[requestNumber]` 3.31 kB / 132 kB; CRM dashboard 227 kB and payments 228 kB first-load JS. Build classification showed home/services/category/detail as ISR/static generation and checkout/API as dynamic.

### Local production-style warm HTTP samples

Five sequential localhost samples were collected from a freshly rebuilt `next start -p 3001` server. These are server response timings from PowerShell; they do **not** include browser download, hydration, external provider work, authenticated CRM data, or a cold-start measurement.

| Route                                         | Samples/status | Min ms | Avg ms | Median ms | Max ms | Notes                                        |
| --------------------------------------------- | -------------: | -----: | -----: | --------: | -----: | -------------------------------------------- |
| `/`                                         |        5 / 200 |  219.7 |  332.3 |     260.9 |  510.4 | Public home.                                 |
| `/services`                                 |        5 / 200 |  329.6 |  411.9 |     435.3 |  456.7 | Slowest measured public page.                |
| `/services/category/business-registration`  |        5 / 200 |  225.8 |  277.9 |     274.8 |  341.5 | Category.                                    |
| `/services/llp-registration`                |        5 / 200 |  200.7 |  223.1 |     221.8 |  252.3 | Service detail.                              |
| `/services/startups`                        |        5 / 200 |  252.8 |  305.0 |     284.8 |  388.1 | Service detail.                              |
| `/crm/login`                                |        5 / 200 |  133.7 |  152.6 |     151.7 |  167.4 | Unauthenticated page.                        |
| `/crm/dashboard`                            |        5 / 200 |  285.9 |  304.6 |     306.9 |  325.5 | Redirect settled on login without a session. |
| `/api/services`                             |        5 / 200 |   42.8 |   52.2 |      52.7 |   63.9 | Fastest measured public data API.            |
| `/api/services?scope=suggestions&query=gst` |        5 / 200 |   65.8 |  102.9 |      67.4 |  242.6 | One high sample.                             |
| `/api/crm/auth`                             |        5 / 401 |    6.6 |   18.1 |       9.9 |   55.4 | No session.                                  |
| `/api/crm/requests?stats=1`                 |        5 / 401 |    7.1 |   10.4 |       9.9 |   15.6 | No session.                                  |
| `/api/crm/payments?stats=1`                 |        5 / 401 |   10.1 |   14.1 |      14.7 |   15.9 | No session.                                  |
| `/api/crm/services?stats=1`                 |        5 / 401 |    6.0 |   10.1 |       9.2 |   15.2 | No session.                                  |

Not measured: authenticated CRM endpoints/pages, token-valid checkout, successful lead API, Razorpay order/verify/webhook, browser LCP/CLS/INP, and production network behavior. A development-server launch attempt on port 3002 did not become reachable and left no listener, so no development latency is reported. The code now logs route-response, failed/successful Supabase storage, checkout-token, Supabase-insert, deferred Sheets, and Meta CAPI timings without customer PII. The earlier 13.5-second development log exceeded `leadTotalMs` because `after()` work is outside that timer; deferred Sheets/Meta duration logs are required to attribute the next occurrence. A `next start` attempt before the fresh build emitted `TypeError: routesManifest.dataRoutes is not iterable`; after the fresh successful build the server served routes. The stale build artifact is a plausible explanation, but the root cause was not proven.

## 18. Chrome vs Incognito / Hydration Investigation

**Reported symptom:** normal Chrome is slower and shows a hydration warning at `src/app/layout.tsx` where `<body>` has an extra `cz-shortcut-listen="true"` attribute. **Source result:** no occurrence of `cz-shortcut-listen`, no app `suppressHydrationWarning`, and no initial-render code that adds a body attribute were found. Browser-only writes found are interaction/effect paths (for example payment script/download behavior), not an initial root-body mutation. Initial public language state is English and browser storage is read in an effect.

Chrome and clean/incognito profiles could not be launched from this environment: both available browser-control paths reported no browser. Therefore no normal-vs-incognito reproduction, extension disabling sequence, DOM-before-hydration inspection, service-worker check, or network/main-thread comparison was performed.

**Assessment:** the unmatched `cz-shortcut-listen` attribute is consistent with a browser extension injecting into `<body>` before hydration, particularly because Incognito commonly disables extensions. This is an **unverified medium-confidence inference**, not a verified application defect. Do not add global `suppressHydrationWarning` merely to conceal it. Reproduce in normal Chrome, Incognito with extensions disabled, and a new clean profile; inspect `document.body` before app hydration and disable extensions one at a time. Only make an app code change if a clean profile reproduces a code-controlled mismatch.

## 19. Security Review

| Status                              | Verified control or gap                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented                         | Server-side pricing/GST snapshot, opaque hashed checkout token with expiry, payment eligibility check, HMAC signature verification with`timingSafeEqual`, provider amount/currency reconciliation, webhook raw-body verification/deduplication, Supabase RPC transaction-like state changes, PII masking on checkout and agent request views, global anti-sniff/frame/referrer/permissions headers. |
| Implemented/configuration-dependent | hCaptcha production fail-closed behavior, Supabase service-role isolation, RLS enabled in checked-in SQL, optional analytics/scripts, HTTPS-only default captcha verification URL. Live RLS policies/configuration were not verified.                                                                                                                                                                 |
| Partial                             | Public and auth/payment rate limits exist but are in-process memory keyed from proxy headers or`unknown`; they are not distributed, durable, or trustworthy without deployment proxy configuration.                                                                                                                                                                                                 |
| Gap/risk                            | CRM uses environment plaintext credential equality rather than hash-backed user identities; no database user/audit model is present.                                                                                                                                                                                                                                                                  |
| Gap/risk                            | Legacy`/api/submit-request` bypasses the current lead flow's hCaptcha, pricing snapshot, service lookup, and rate limiter. Its callers and exposure should be reviewed before removal/hardening.                                                                                                                                                                                                    |
| Not verified                        | CSRF behavior behind hosting, CSP, production RLS policies, secrets in deployed build, dependency vulnerability status, provider dashboard webhook settings, and database audit retention.                                                                                                                                                                                                            |

No dynamic SQL construction or unsafe HTML injection was identified in inspected paths. External API error logging generally logs codes/reasons rather than raw form/provider payloads; a full centralized log/PII-retention review was not available because there is no logging platform configuration in the repository.

## 20. SEO, Responsive, Loading, and Error Behaviour

Root metadata, canonical helpers, Open Graph/Twitter metadata, JSON-LD, `robots.ts`, and `sitemap.ts` are present. Robots allow public pages and disallow API/CRM/admin and query URLs. Sitemap includes static public entries plus successfully fetched public service/category routes; failures yield an empty dynamic portion. Checkout declares noindex. CRM pages are session-protected but this audit did not verify route-level `noindex` metadata on each CRM page.

Tailwind responsive classes are used throughout home, services, navbar, cards, and CRM controls. Hero stats wrap/stack and hide separators below small screens. Error/empty states include global/service loading skeletons, not-found service/category/checkout paths, service unavailable handling, payment disabled/quote-required states, and CRM loading skeletons. Error detail is generally user-facing/masked, while route handlers log internal error codes.

## 21. Findings and Issue Status

| ID   | Severity      | Status                      | Evidence / impact / recommended next action                                                                                                                                                                                                  |
| ---- | ------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | High          | Active release blocker      | Live read-only checks prove `requests.service_id`, five other request payment columns, and `services.pricing_type` are absent. The first failed insert field is `service_id`, which explains `PGRST204`; apply `20260801_request_payment_hardening.sql`, then `20260803_reload_postgrest_schema.sql`, before enabling checkout. |
| F-02 | Medium        | Active design/security risk | CRM env plaintext credential comparison and per-process throttling do not scale across instances. Move to identity/password hashing and shared rate-limit storage when CRM scope permits.                                                    |
| F-03 | Medium        | Active legacy endpoint risk | `/api/submit-request` bypasses current hCaptcha/price/storage policy controls. Trace callers and retire or route it through `lead.service.ts`.                                                                                           |
| F-04 | Informational | Fixed                       | Stale WhatsApp redirect copy and response `whatsappUrl` were removed. Payable form responses say `Opening secure checkout...`; non-payable/fallback responses use backend-safe received-request copy. |
| F-05 | Low           | Active cache consideration  | Content script has no explicit Next cache-tag invalidation; public content can remain stale briefly. Add a controlled revalidation/deploy step when operationally needed.                                                                    |
| F-06 | Low           | Configuration-dependent     | Missing public hCaptcha site key disables client submission. Keep public/server hCaptcha settings paired.                                                                                                                                    |
| F-07 | Informational | Not verified                | `cz-shortcut-listen="true"` hydration symptom most likely extension injection; no browser was available for confirmation. Do not suppress globally.                                                                                        |
| F-08 | Informational | Fixed in current code       | Public catalogue code is Supabase-only; Google Sheets/static fallback is absent from public`services.datasource.ts`.                                                                                                                       |
| F-09 | Informational | Fixed                       | Service detail previously passed `hideWhatsAppFloat`, suppressing the configured support button. It now uses the normal public layout; the float remains explicit-click only and preserves contact analytics. |
| F-10 | Informational | Not reproducible            | Invalid Next config`__esModule` warning was not emitted by the fresh production build.                                                                                                                                                     |
| F-11 | Informational | Addressed by migration      | Legacy`requested` status is normalized to `new` in hardening migration; live constraint state remains unverified.                                                                                                                        |
| F-12 | Informational | Not found                   | No Supabase Realtime subscriptions were found, therefore no subscription-cleanup duplication issue is currently applicable.                                                                                                                  |

Service images/features/documents are data-dependent: code supports them and the sync script updates them, but completeness cannot be asserted without querying live rows. Create-order HTTP 400 is expected for malformed input; successful payment flow was intentionally not invoked. Quote/zero-price services are intentionally non-payable, not an error.

## 22. Tests, Build, Git Status, and Audit Limits

After the request-flow changes, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all passed. The isolated production build took 145.8 seconds (41 seconds compilation and the remainder static generation/tracing); this is a build measurement, not lead/API latency. The suite now also covers internal checkout URL validation, WhatsApp support-link generation, Supabase request insert fields, PGRST204-safe schema diagnostics, and fallback payment disablement. Test coverage remains unit/contract-style and does not provide browser E2E, live Supabase writes, or Razorpay integration coverage.

Git branch is `main`. The working tree was already dirty before this audit with many application/config modifications and untracked Supabase/payment/service-support files. This audit intentionally does not revert, stage, commit, stash, or otherwise alter those files. The only intended audit artifact modification is this root `context.md`.

Intentionally not performed: reading secret values, modifying environment/database/payment/provider state, submitting a lead, creating/verifying a real payment, sending a webhook, live Supabase schema query, live Google Sheets access, deployment inspection, browser testing, or performance testing against hosted infrastructure.

## 23. Important File Map and Safe Change Ownership

| Change area                 | Start here                                                                                                       | Follow through                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Public catalogue/visibility | `src/server/services.service.ts`, `services.datasource.ts`, `repositories/services.supabase.repository.ts` | `src/types/service.ts`, `/api/services`, service pages, CRM service API, schema/migration, tests. Do not add public fallback accidentally. |
| Service content             | `scripts/service-content.mjs`, `update-supabase-service-content.mjs`                                         | service row mapper,`ServiceVisual`, detail UI; preserve existing rows/pricing/status.                                                        |
| Lead form                   | `ServiceDetailClient.tsx`, `/api/leads/route.ts`, `lead.service.ts`                                        | captcha, request repo, pricing/GST, rate limiter, Meta CAPI, tests.                                                                            |
| Checkout/payments           | checkout page/action, three`/api/payments/*` routes                                                            | Razorpay service, payment/request repos, checked-in migration/RPCs; test only against safe configuration.                                      |
| CRM auth/access             | `lib/crm-auth.ts`, `lib/crm-session.ts`, `lib/crm-access.ts`, dashboard layout                             | all CRM API routes and client tables; preserve agent PII scoping.                                                                              |
| CRM persistence             | CRM repositories,`lib/crm-*-store.ts`                                                                          | Google Sheets configuration/fallback behavior, CSV routes, tables.                                                                             |
| SEO/public shell            | `app/layout.tsx`, `robots.ts`, `sitemap.ts`, `lib/site-url.ts`                                           | avoid changing public metadata/canonical logic without route review.                                                                           |
| Analytics/i18n              | analytics providers/meta helpers, language context/i18n                                                          | preserve deferral, consent/product requirements, and client-only behavior.                                                                     |

## 24. Guidance for Future Developers and AI Agents

1. Treat live code and deployed schema as authoritative; this document is a source-verified snapshot, not a substitute for production inspection.
2. Keep public service visibility filtering in the public service layer. CRM administration must continue to see non-public statuses.
3. Any new request/payment field requires all of: TypeScript mapping, repository query/insert/update, checked-in schema/migration, RPC review, API behavior, CSV concerns, and tests.
4. Do not weaken checkout-token, server pricing, Razorpay signature/reconciliation, or service-role boundaries to simplify UI work.
5. Preserve raw-body handling for webhooks and avoid logging form data, secrets, tokens, signatures, or full provider payloads.
6. Do not add broad hydration-warning suppression for extension-controlled DOM changes. Reproduce in a clean browser profile first.
7. Use a safe test environment for lead/payment verification. Never create production orders or fake a production success callback.
8. Before touching legacy Google Sheets code, identify whether the affected path is public catalogue (no fallback) or CRM/request fallback (still present).
9. Keep changes scoped; this repository is presently dirty, so never reset/revert unrelated work. Run lint, typecheck, tests, and build for behavior changes.

## 25. Audit Confidence and Remaining Unknowns

High confidence: repository topology, source routes/components/data flow, checked-in schema/migrations, build result, local warm HTTP timings, absence of public Sheets fallback and auto-WhatsApp opening, no source `cz-shortcut-listen`/Realtime subscription.

Medium confidence: stale pre-build `next start` failure was build-artifact related; extension injection likely explains the reported hydration warning.

Unknown until external verification: the successful post-migration request insert, Supabase RPC/function deployment, Razorpay test checkout and webhook delivery, Google Sheets readiness, hosted latency, normal-vs-incognito performance, browser Web Vitals, and customer-data operational behavior. The missing PGRST204 field is no longer unknown.

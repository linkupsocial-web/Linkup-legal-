# Linkup Legal — Service Connect Hub

> A modern legal service discovery and lead generation platform built with **Next.js 15**, App Router, TypeScript, and Tailwind CSS. Connects users with legal professionals across multiple service categories through an intelligent search, filtering, and WhatsApp-based lead submission system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [File Reference](#file-reference)
  - [App Layer (`src/app`)](#app-layer-srcapp)
  - [Components (`src/components`)](#components-srccomponents)
  - [Server Layer (`src/server`)](#server-layer-srcserver)
  - [Context & State (`src/context`)](#context--state-srccontext)
  - [Internationalisation (`src/i18n`)](#internationalisation-srci18n)
  - [Data & Types (`src/data`, `src/types`)](#data--types-srcdata-srctypes)
  - [Hooks & Utilities (`src/hooks`, `src/lib`)](#hooks--utilities-srchooks-srclib)
- [Routing](#routing)
- [Data Flow](#data-flow)
- [Internationalisation](#internationalisation)
- [SEO & Structured Data](#seo--structured-data)
- [Lead Submission Flow](#lead-submission-flow)
- [Improvements Over React (Vite) Version](#improvements-over-react-vite-version)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)

---

## Overview

Linkup Legal is a service marketplace platform that allows users to:

- Browse and search legal/professional services by name or category
- View detailed service pages with pricing, required documents, and features
- Submit service requests directly via WhatsApp with optional Google Sheets API storage
- Experience the platform in multiple languages with runtime auto-translation

The project was converted from a React + Vite SPA to a full **Next.js 15 App Router** application, gaining SSG/SSR, file-based routing, SEO metadata, and server components.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component Library | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Fonts | next/font (self-hosted, no FOUT) |
| State | React Context + in-memory hooks |
| i18n | Custom runtime auto-translate layer |
| Lead Delivery | WhatsApp deep-link + optional Google Sheets API append |

---

## Project Structure

```
public
├── favicon.svg
src
├── app                         # Next.js App Router routes & global configs
│   ├── globals.css             # Design tokens, themes, Tailwind layers
│   ├── layout.tsx              # Root layout (fonts, providers, scripts)
│   ├── loading.tsx             # Global loading skeleton
│   ├── not-found.tsx           # Custom 404 page
│   ├── page.tsx                # Home page route (/)
│   ├── robots.ts               # robots.txt generator
│   ├── sitemap.ts              # Dynamic sitemap.xml generator
│   └── services
│       ├── loading.tsx         # Services listing skeleton
│       ├── page.tsx            # /services server page
│       ├── ServicesClient.tsx  # Client-side search/filter UI
│       ├── [slug]
│       │   ├── loading.tsx     # Service detail skeleton
│       │   ├── page.tsx        # /services/:slug server page
│       │   └── ServiceDetailClient.tsx  # Detail page client UI
│       └── category
│           └── [category]
│               └── page.tsx    # /services/category/:category page
├── components
│   ├── animation
│   │   └── RevealOnScroll.tsx  # Intersection Observer reveal wrapper
│   ├── home                    # Home page section components
│   │   ├── HeroSection.tsx
│   │   ├── StatsSection.tsx
│   │   ├── PopularServicesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── TrustSection.tsx
│   │   ├── CtaSection.tsx
│   │   └── GoogleReviewSection.tsx
│   ├── layout                  # Global shell components
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── RouteTransitionLoader.tsx
│   ├── services
│   │   └── ServiceCard.tsx     # Reusable service card component
│   └── ui                      # shadcn/ui primitives
│       ├── badge.tsx, button.tsx, card.tsx
│       ├── dialog.tsx, input.tsx, label.tsx
│       ├── separator.tsx, sheet.tsx, skeleton.tsx
│       ├── textarea.tsx, toast.tsx, toaster.tsx
│       ├── toggle.tsx, tooltip.tsx
├── context
│   └── language-context.tsx    # Global language state & provider
├── data
│   └── services.ts             # Static service catalog seed data
├── hooks
│   ├── use-mobile.tsx          # Mobile viewport detection hook
│   └── use-toast.ts            # Toast notification state manager
├── i18n
│   ├── translations.ts         # English source message tree + types
│   └── auto-translate.ts       # Runtime batch translation helpers
├── lib
│   ├── utils.ts                # cn() Tailwind class merge utility
│   └── fetcher.ts              # Typed JSON fetch wrapper
├── server
│   ├── services.datasource.ts  # Data source interface + static impl
│   ├── services.repository.ts  # Indexed repository with caching
│   ├── services.service.ts     # Domain service layer + filters
│   └── search.service.ts       # Paginated search service
└── types
    └── service.ts              # Core Service TypeScript interface
```

---

## Architecture

The application is a **modular monolith** with a layered architecture that keeps concerns cleanly separated:

```
Route (page.tsx)
    └── Server Layer (services.service.ts)
            └── Repository (services.repository.ts)
                    └── DataSource (services.datasource.ts)
                            └── Static Data (data/services.ts)
```

**Server Components** handle data fetching and SEO at the page level. **Client Components** handle interactivity (search, filters, form submission). The server layer is intentionally server-only and is never imported into client bundles.

---

## Key Features

- **Static Site Generation** — service detail and category pages are pre-rendered at build time via `generateStaticParams`
- **Server Components by Default** — data fetching happens on the server; only interactive sections are client components
- **Dynamic Search & Filter** — live search with suggestion dropdown and category pill filters, all client-side
- **Multi-language Support** — English source strings are auto-translated at runtime and cached per-language
- **WhatsApp Lead Flow** — request forms open a pre-filled WhatsApp conversation with the service details
- **Structured Data (JSON-LD)** — `LegalService`, `Breadcrumb`, `Organization`, and `WebSite` schemas for rich search results
- **Scroll Reveal Animations** — `RevealOnScroll` wrapper uses Intersection Observer with reduced-motion support
- **Responsive Design** — mobile-first Tailwind layout with a custom `use-mobile` hook
- **Loading Skeletons** — every route has a dedicated skeleton (`loading.tsx`) to prevent layout shift

---

## File Reference

### App Layer (`src/app`)

| File | Route | Purpose |
|---|---|---|
| `globals.css` | — | Design tokens (CSS variables), Tailwind layers, light/dark theme, base element styles |
| `layout.tsx` | All routes | Root layout: loads fonts, wraps app in `LanguageProvider`, mounts `RouteTransitionLoader`, injects optional GA/WhatsApp scripts, sets global metadata and viewport |
| `loading.tsx` | Global | Skeleton placeholders for hero, stats, and service card sections during initial load |
| `not-found.tsx` | `*` (404) | Custom 404 page with SEO metadata and "Return to Home" button |
| `page.tsx` | `/` | Composes all home page sections via dynamic imports; injects `Organization` + `WebSite` JSON-LD schemas |
| `robots.ts` | `/robots.txt` | Allows general crawling, blocks `/api/` and `/admin/`, links to sitemap |
| `sitemap.ts` | `/sitemap.xml` | Generates dynamic sitemap entries for static pages plus all service and category pages |
| `services/page.tsx` | `/services` | Server page: fetches services + categories in parallel, passes to `ServicesClient` |
| `services/ServicesClient.tsx` | `/services` (client) | Category pills, live search combobox, suggestion navigation, filtered card grid |
| `services/loading.tsx` | `/services` | Skeleton for heading, search input, filter pills, and card grid |
| `services/[slug]/page.tsx` | `/services/:slug` | SSG with `generateStaticParams`; metadata, not-found handling, JSON-LD (`LegalService` + `Breadcrumb`), renders `ServiceDetailClient` |
| `services/[slug]/ServiceDetailClient.tsx` | `/services/:slug` (client) | Translated service content display, request form, WhatsApp + Sheets submission, toast feedback, call CTA |
| `services/[slug]/loading.tsx` | `/services/:slug` | Skeleton for service info blocks and request form panel |
| `services/category/[category]/page.tsx` | `/services/category/:category` | Dynamic category page: resolves slug → category, generates metadata, fetches filtered services, reuses `ServicesClient` |

---

### Components (`src/components`)

#### Animation

**`RevealOnScroll.tsx`** — Client wrapper that uses `IntersectionObserver` to reveal children when they scroll into view. Supports configurable delay and respects the `prefers-reduced-motion` media query.

#### Home Sections

| Component | Purpose |
|---|---|
| `HeroSection.tsx` | Main landing hero with value proposition, primary/secondary CTAs, and trust badge row |
| `StatsSection.tsx` | Animated counter display for key metrics (total requests, expert count, success rate, response time) |
| `PopularServicesSection.tsx` | Server component showing featured/popular services with links to the full listing |
| `HowItWorksSection.tsx` | 4-step process explainer with icons and localised step text |
| `TrustSection.tsx` | Trust signals section: security indicators, recognition badges, expert quality statements |
| `CtaSection.tsx` | Bottom-of-page CTA panel directing users to browse services |
| `GoogleReviewSection.tsx` | Client review carousel with auto-slide timer, manual controls, dot indicators, and runtime-translated review text and relative timestamps |

#### Layout

| Component | Purpose |
|---|---|
| `Layout.tsx` | Shared page shell composing `Navbar` + `<main>` + `Footer` |
| `Navbar.tsx` | Responsive top navigation bar with language selector dropdown and mobile hamburger menu |
| `Footer.tsx` | Multi-column footer with localised links, service categories, contact info, and copyright |
| `RouteTransitionLoader.tsx` | Global client overlay that shows a skeleton during slow route transitions using `usePathname` + `useEffect` |

#### Services

**`ServiceCard.tsx`** — Reusable card component displaying service icon (mapped from a string key to a Lucide icon), localised title and description, pricing, estimated duration, and a link to the detail page.

#### UI Primitives (`src/components/ui`)

All primitives are built on **shadcn/ui** (Radix UI) and styled with Tailwind + CVA (Class Variance Authority).

| Primitive | Notes |
|---|---|
| `badge.tsx` | Variant-based badge: `default`, `secondary`, `destructive`, `outline` |
| `button.tsx` | Full variant/size matrix including `hero`, `outline`, `ghost`, `link`; supports `asChild` for polymorphism |
| `card.tsx` | Composable `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `dialog.tsx` | Radix Dialog: `Dialog`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` |
| `input.tsx` | Styled `<input>` primitive with consistent focus ring |
| `label.tsx` | Radix Label-based `<label>` primitive |
| `separator.tsx` | Horizontal/vertical `<hr>`-style separator |
| `sheet.tsx` | Radix-based side drawer with `top`, `right`, `bottom`, `left` directional variants |
| `skeleton.tsx` | `animate-pulse` placeholder block for loading states |
| `textarea.tsx` | Styled `<textarea>` primitive |
| `toast.tsx` | Full toast system: `ToastProvider`, `ToastViewport`, `Toast`, `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription`; variants: `default`, `destructive` |
| `toaster.tsx` | Renders active toasts from `useToast` store into the viewport |
| `toggle.tsx` | Radix Toggle with size and variant styles |
| `tooltip.tsx` | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` |

---

### Server Layer (`src/server`)

The server layer is **server-only** (never imported in client bundles). It follows a clean separation of repository, domain service, and data source concerns.

**`services.datasource.ts`**

Defines the `ServicesDataSource` interface and provides a static implementation backed by `src/data/services.ts`. Acts as the data access abstraction — swap this out for a database or API without touching the rest of the layer.

**`services.repository.ts`**

Wraps the data source and builds in-memory indexes:

- `bySlug` — direct O(1) lookup of a service by its URL slug
- Full-text search tokens — normalised text index for search matching

Exposes helpers: `getBySlug`, `getAll`, `getByCategory`, `search`. Results are cached with Next.js `unstable_cache`.

**`services.service.ts`**

Domain service layer consuming the repository. Provides:

- `getPopularServices()` — returns featured/top services for the home page
- `getServiceBySlug(slug)` — single service lookup with not-found handling
- `getAllServices()` — complete catalog for the services listing page
- `getServicesByCategory(category)` — category-filtered listing
- `getCategoryBySlug(slug)` — resolves a URL slug to the canonical category name
- `getAllSlugs()` and `getAllCategorySlugs()` — used by `generateStaticParams`
- `revalidateServiceCache()` — triggers Next.js cache tag invalidation

**`search.service.ts`**

Dedicated paginated search service. Normalises query params (trim, lowercase), delegates to the repository search index, and returns a typed response: `{ items, total, page, hasMore }`. Results are cached independently from the main service cache.

---

### Context & State (`src/context`)

**`language-context.tsx`**

Global React Context providing language selection across the entire application.

- Persists the selected language to `localStorage`
- Updates `document.documentElement.lang` on change
- Asynchronously loads translated message bundles via `auto-translate.ts`
- Exposes `{ language, setLanguage, messages, isLoading }` via `useLanguage()` hook

---

### Internationalisation (`src/i18n`)

**`translations.ts`**

Contains the complete English source message tree as a deeply nested TypeScript object. Also exports `Language` (union type of supported language codes) and `Messages` (typed message tree) for type-safe access throughout the app.

**`auto-translate.ts`**

Runtime translation engine:

- `flattenMessages` / `unflattenMessages` — converts the nested message tree to/from a flat key-value map for efficient batch processing
- Batch translation — groups multiple strings into a single translation API call to reduce latency
- In-flight deduplication — concurrent translation requests for the same language are merged into one call
- Per-language caching — translated message bundles are cached in memory after first load to avoid repeated API calls
- Exposes `translateMessages(lang, sourceMessages)` returning a promise of the translated message tree

---

### Data & Types (`src/data`, `src/types`)

**`src/data/services.ts`**

Static seed data file containing:

- `serviceCategories` — array of category objects (`{ slug, name, icon, description }`)
- `services` — full catalog of service entries (see `Service` type below)

This is the single source of truth for service data in the current implementation. Replace with a database query in `services.datasource.ts` without touching anything else.

**`src/types/service.ts`**

Core `Service` TypeScript interface used across all layers:

```typescript
interface Service {
  id: string
  slug: string
  title: string
  description: string
  category: string
  categorySlug: string
  icon: string
  price: number
  duration: string
  featured?: boolean
  documents?: string[]
  features?: string[]
  // ... additional fields
}
```

---

### Hooks & Utilities (`src/hooks`, `src/lib`)

**`src/hooks/use-mobile.tsx`**

Returns `true` if the viewport width is below 768px. Uses `window.matchMedia` with a change listener for reactive updates. Used by `Navbar` to decide between desktop and mobile menu rendering.

**`src/hooks/use-toast.ts`**

In-memory toast notification state manager (no external library):

- Internal reducer managing a queue of active toasts
- `toast()` dispatch helper accepting `{ title, description, variant, action }`
- Auto-dismissal timer per toast
- `useToast()` hook exposing `{ toasts, toast, dismiss }`

**`src/lib/utils.ts`**

Exports `cn(...inputs)` — a class name merge utility combining `clsx` (conditional classes) and `tailwind-merge` (deduplication of conflicting Tailwind utilities). Used throughout all components.

**`src/lib/fetcher.ts`**

Typed JSON fetch wrapper for client-side data fetching:

- Accepts a `cache` config option passed to the underlying `fetch`
- Throws a typed `FetcherError` with `status` and `message` on non-OK responses
- Generic return type: `fetcher<T>(url, options) => Promise<T>`

---

## Routing

| URL Pattern | Page File | Type |
|---|---|---|
| `/` | `app/page.tsx` | Server Component (SSR) |
| `/services` | `app/services/page.tsx` | Server Component (SSR) |
| `/services/:slug` | `app/services/[slug]/page.tsx` | Static (SSG via `generateStaticParams`) |
| `/services/category/:category` | `app/services/category/[category]/page.tsx` | Static (SSG via `generateStaticParams`) |
| `/robots.txt` | `app/robots.ts` | Metadata Route |
| `/sitemap.xml` | `app/sitemap.ts` | Metadata Route |

---

## Data Flow

```
Build Time
  services.service.ts → getAllSlugs() → generateStaticParams → pre-render pages

Request Time (SSR pages)
  page.tsx → services.service.ts → services.repository.ts → services.datasource.ts → data/services.ts

Client Side (interactive)
  ServicesClient ← category/search state ← user interaction
  ServiceDetailClient → /api/leads → lead.service.ts → Google Sheets API append + WhatsApp deep link
```

---

## Internationalisation

The i18n system is entirely custom and runtime-based:

1. `translations.ts` defines the English master message tree
2. User selects a language via the `Navbar` language picker
3. `language-context.tsx` calls `translateMessages(lang, englishMessages)`
4. `auto-translate.ts` flattens the tree, batches strings, calls the translation API, and reconstructs the nested structure
5. Translated messages are cached in memory; the context re-renders with the new bundle
6. Components consume `useLanguage().messages` for all user-facing strings

---

## SEO & Structured Data

Each route generates its own metadata via `generateMetadata`:

- `title`, `description`, `openGraph`, `twitter`, `canonical`
- `alternates.languages` for hreflang tags

Structured data is injected as `<script type="application/ld+json">` in the page `<head>`:

| Page | Schema Types |
|---|---|
| `/` | `Organization`, `WebSite` |
| `/services/:slug` | `LegalService`, `BreadcrumbList` |

---

## Lead Submission Flow

When a user submits the request form on a service detail page:

1. `ServiceDetailClient` validates the form fields
2. On submit:
   a. The form POSTs to `/api/leads`
   b. The server validates and normalizes the payload in `lead.service.ts`
   c. **Optional storage/integrations** — the server can persist the request and send it to connected services when configured
   d. **WhatsApp** — constructs a pre-filled WhatsApp URL (`https://wa.me/...?text=...`) with service name, user details, and request summary; opens in a new tab
3. A success or error toast is displayed via `useToast`
4. The form resets on successful submission

---

## Improvements Over React (Vite) Version

| React (Vite) | Next.js 15 |
|---|---|
| Client-side routing (React Router) | File-based App Router routing |
| No SEO metadata | `generateMetadata` per page + JSON-LD |
| All components client-side | Server Components by default |
| Manual lazy loading | Built-in code splitting + `dynamic()` |
| No static generation | `generateStaticParams` for SSG |
| Google Fonts via CDN (FOUT risk) | `next/font` self-hosted, zero FOUT |
| No sitemap / robots | Auto-generated via Metadata Route API |
| No loading states | Dedicated `loading.tsx` per route |
| No structured data | `LegalService`, `Organization`, etc. |

---

## Getting Started

**Prerequisites:** Node.js 18+, npm 9+

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build & Deployment

```bash
# Production build (SSG + SSR)
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---


# `src` File Map

## `src/app`

- `src/app/globals.css`: Global stylesheet with Tailwind layers and app design tokens (colors, shadows, radius). Defines base styles for body, headings, borders, smooth scrolling, and light/dark theme variables.
- `src/app/layout.tsx`: Root layout for all routes. Loads global fonts and styles, wraps pages in `LanguageProvider`, mounts `RouteTransitionLoader`, and injects optional analytics/widget scripts with global metadata.
- `src/app/loading.tsx`: App-level loading fallback. Renders skeleton placeholders while top-level route content is loading.
- `src/app/not-found.tsx`: Custom 404 route UI with metadata. Shows a friendly message and a link back to home inside the shared layout.
- `src/app/page.tsx`: Home page route (`/`). Composes all landing sections, adds structured data (Organization + WebSite), and configures SEO metadata.
- `src/app/robots.ts`: Generates `robots.txt` rules. Allows crawl generally, blocks `/api/` and `/admin/`, and references sitemap URL.
- `src/app/sitemap.ts`: Builds dynamic sitemap entries for static routes plus category/service detail routes from server data.

### `src/app/services`

- `src/app/services/loading.tsx`: Loading skeleton for the services listing page.
- `src/app/services/page.tsx`: Server route for `/services`. Fetches initial service results + categories and passes them to client UI.
- `src/app/services/ServicesClient.tsx`: Client-side search/filter experience for services. Handles search suggestions, category filters, and result rendering.

### `src/app/services/category/[category]`

- `src/app/services/category/[category]/page.tsx`: Dynamic category page. Resolves category slug, generates metadata, fetches category-filtered services, and renders with `ServicesClient`.

### `src/app/services/[slug]`

- `src/app/services/[slug]/loading.tsx`: Loading skeleton for service detail page.
- `src/app/services/[slug]/page.tsx`: Dynamic service detail server page. Handles static params, metadata, not-found flow, and JSON-LD schema injection.
- `src/app/services/[slug]/ServiceDetailClient.tsx`: Client detail UI and lead form logic. Supports translation, WhatsApp submission, optional sheet webhook, toast feedback, and call CTA.

## `src/components/animation`

- `src/components/animation/RevealOnScroll.tsx`: Reusable scroll-reveal wrapper that animates children when they enter viewport (with reduced-motion handling).

## `src/components/home`

- `src/components/home/HeroSection.tsx`: Hero block with core value proposition, CTAs, and trust highlights.
- `src/components/home/StatsSection.tsx`: Animated KPI counters shown in a stats strip.
- `src/components/home/PopularServicesSection.tsx`: Server-rendered section showing popular services and “view all” navigation.
- `src/components/home/HowItWorksSection.tsx`: Four-step process explainer with icons and localized labels.
- `src/components/home/TrustSection.tsx`: Trust/credibility section covering security, recognition, and verified experts.
- `src/components/home/CtaSection.tsx`: Primary call-to-action panel linking users to browse services.
- `src/components/home/GoogleReviewSection.tsx`: Client review carousel with auto-slide, controls, and localized review text.

## `src/components/layout`

- `src/components/layout/Layout.tsx`: Shared page shell with `Navbar`, `main`, and `Footer`.
- `src/components/layout/Navbar.tsx`: Responsive top navigation with route links and language selector.
- `src/components/layout/Footer.tsx`: Localized footer with grouped links and company/legal blocks.
- `src/components/layout/RouteTransitionLoader.tsx`: Global route-transition overlay shown when navigation takes longer than a delay.

## `src/components/services`

- `src/components/services/ServiceCard.tsx`: Reusable service card component with icon mapping, localized content, and detail-page linking.

## `src/components/ui`

- `src/components/ui/badge.tsx`: Badge primitive with style variants via CVA.
- `src/components/ui/button.tsx`: Button primitive with size/variant system and `asChild` support.
- `src/components/ui/card.tsx`: Card primitives (`Card`, `CardHeader`, `CardContent`, etc.).
- `src/components/ui/dialog.tsx`: Radix-based dialog/modal primitives with overlay/content helpers.
- `src/components/ui/input.tsx`: Styled input primitive.
- `src/components/ui/label.tsx`: Styled label primitive.
- `src/components/ui/separator.tsx`: Horizontal/vertical separator primitive.
- `src/components/ui/sheet.tsx`: Side sheet/drawer primitives built on Radix dialog.
- `src/components/ui/skeleton.tsx`: Skeleton placeholder primitive.
- `src/components/ui/textarea.tsx`: Styled textarea primitive.
- `src/components/ui/toast.tsx`: Toast primitives and variant styles.
- `src/components/ui/toaster.tsx`: Toast renderer that subscribes to `useToast` state.
- `src/components/ui/toggle.tsx`: Toggle primitive with variants and sizes.
- `src/components/ui/tooltip.tsx`: Tooltip primitives with trigger/content/provider.

## `src/context`

- `src/context/language-context.tsx`: Global language provider and hook. Persists language selection, updates document language, and loads translated messages.

## `src/data`

- `src/data/services.ts`: Static service catalog and category seed data.

## `src/hooks`

- `src/hooks/use-mobile.tsx`: Hook for mobile breakpoint detection (`<768px`).
- `src/hooks/use-toast.ts`: Client-side toast state/reducer store and helper APIs.

## `src/i18n`

- `src/i18n/translations.ts`: Source translation strings and i18n TypeScript types.
- `src/i18n/auto-translate.ts`: Runtime translation utilities with flatten/unflatten logic, batching, and in-memory caching.

## `src/lib`

- `src/lib/utils.ts`: Utility `cn()` for merging class names (`clsx` + `tailwind-merge`).
- `src/lib/fetcher.ts`: Typed JSON fetch helpers and custom error class with optional Next cache config.

## `src/server`

- `src/server/services.datasource.ts`: Data source interface + static implementation for services/categories.
- `src/server/services.repository.ts`: Cached repository/index layer for fast service lookup and search text indexing.
- `src/server/services.service.ts`: Domain-level service helpers for filtering, popular services, slug handling, and revalidation.
- `src/server/search.service.ts`: Cached paginated search logic returning items and pagination metadata.

## `src/types`

- `src/types/service.ts`: Shared `Service` interface used across data, server, and UI.

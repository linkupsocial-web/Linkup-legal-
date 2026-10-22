"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Languages, Mail, MapPin, Menu, Phone, Search, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { trackContact, trackSearch } from "@/lib/analytics/meta-browser";
import { CALL_NUMBER, CALL_NUMBER_HREF, CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { useLanguage } from "@/context/language-context";

type ServiceSuggestionItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  icon?: string | null;
};

const NAVBAR_SUGGESTION_LIMIT = 5;
const NAVBAR_SUGGESTION_DEBOUNCE_MS = 300;
const NAVBAR_EMPTY_SUGGESTION_DEBOUNCE_MS = 120;

const NavbarSuggestionIcon = dynamic(() => import("./NavbarSuggestionIcon"), {
  ssr: false,
  loading: () => (
    <span
      aria-hidden="true"
      className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50"
    />
  ),
});

const cachedServiceSuggestions = new Map<string, ServiceSuggestionItem[]>();

function getSuggestionCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

async function loadServiceSuggestions(query: string, signal: AbortSignal): Promise<ServiceSuggestionItem[]> {
  const key = getSuggestionCacheKey(query);
  const cached = cachedServiceSuggestions.get(key);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    scope: "suggestions",
    limit: String(NAVBAR_SUGGESTION_LIMIT),
  });
  if (key) params.set("query", key);

  const response = await fetch(`/api/services?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load services index: ${response.status}`);
  }

  const payload = (await response.json()) as { services?: ServiceSuggestionItem[] };
  const services = Array.isArray(payload.services) ? payload.services : [];
  cachedServiceSuggestions.set(key, services);
  return services;
}

const navLinkConfig = [
  { key: "home", path: "/" },
  { key: "services", path: "/services" },
  { key: "howItWorks", path: "/#how-it-works" },
] as const;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ServiceSuggestionItem[]>([]);
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const lastTrackedSearchRef = useRef("");
  const navLinks = useMemo(
    () =>
      navLinkConfig.map((link) => ({
        path: link.path,
        label: t.navbar[link.key],
      })),
    [t]
  );
  const searchTerm = search.trim().toLowerCase();
  const shouldLoadSuggestions = showSuggestions || mobileSearchOpen;

  useEffect(() => {
    if (!shouldLoadSuggestions) return;
    if (searchTerm.length > 0 && searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    const suggestionQuery = searchTerm.length >= 2 ? searchTerm : "";
    const cached = cachedServiceSuggestions.get(getSuggestionCacheKey(suggestionQuery));
    if (cached) {
      setSuggestions(cached);
      return;
    }

    const controller = new AbortController();
    const debounceMs = suggestionQuery ? NAVBAR_SUGGESTION_DEBOUNCE_MS : NAVBAR_EMPTY_SUGGESTION_DEBOUNCE_MS;

    const timer = window.setTimeout(() => {
      void loadServiceSuggestions(suggestionQuery, controller.signal)
        .then((services) => setSuggestions(services))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          console.error("Failed to load navbar service suggestions.", error);
          setSuggestions([]);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, shouldLoadSuggestions]);

  useEffect(() => {
    if (searchTerm.length < 2) {
      lastTrackedSearchRef.current = "";
      return;
    }

    const surface = mobileSearchOpen ? "navbar_mobile_search" : "navbar_desktop_search";
    const key = `${surface}:${searchTerm}`;
    const timer = window.setTimeout(() => {
      if (lastTrackedSearchRef.current === key) return;

      lastTrackedSearchRef.current = key;
      trackSearch({
        search_string: searchTerm,
        surface,
        mode: "input",
        result_count: suggestions.length,
      });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileSearchOpen, searchTerm, suggestions.length]);

  useEffect(() => {
    if (searchTerm.length < 2) return;
    if (showSuggestions || mobileSearchOpen) return;

    lastTrackedSearchRef.current = "";
  }, [mobileSearchOpen, searchTerm.length, showSuggestions]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const surface = mobileSearchOpen ? "navbar_mobile_search" : "navbar_desktop_search";

    if (searchTerm.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(false);
      trackSearch({
        search_string: searchTerm,
        surface,
        mode: "submit_select_first",
        selected_service_slug: suggestions[0].slug,
        result_rank: 1,
        result_count: suggestions.length,
      });
      router.push(`/services/${suggestions[0].slug}`);
      return;
    }

    if (searchTerm.length > 0) {
      trackSearch({
        search_string: searchTerm,
        surface,
        mode: "submit",
        result_count: 0,
      });
    }

    router.push("/services");
  };

  const handleSuggestionClick = (slug: string, index: number, surface: string) => {
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    trackSearch({
      search_string: searchTerm,
      surface,
      mode: "select",
      selected_service_slug: slug,
      result_rank: index + 1,
      result_count: suggestions.length,
    });
    router.push(`/services/${slug}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/50 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
      <div className="border-b border-white/40 bg-white/25">
        <div className="container flex h-9 items-center justify-between gap-4 text-xs text-foreground/90">
          <div className="hidden items-center gap-2 sm:flex">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="line-clamp-1">
              H-150, H Block, Sector 63, Noida, Uttar Pradesh 201301
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {CALL_NUMBER_HREF ? (
              <a
                href={CALL_NUMBER_HREF}
                onClick={() =>
                  trackContact({
                    contact_channel: "phone",
                    surface: "navbar_topbar",
                    destination: CALL_NUMBER_HREF,
                  })
                }
                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                {CALL_NUMBER}
              </a>
            ) : null}
            {CALL_NUMBER_HREF && CONTACT_EMAIL_HREF ? (
              <span className="h-3.5 w-px bg-border" />
            ) : null}
            {CONTACT_EMAIL_HREF ? (
              <a
                href={CONTACT_EMAIL_HREF}
                onClick={() =>
                  trackContact({
                    contact_channel: "email",
                    surface: "navbar_topbar",
                    destination: CONTACT_EMAIL_HREF,
                  })
                }
                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{CONTACT_EMAIL}</span>
                <span className="sm:hidden">Email</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-[#ff9933]/80 via-white/80 to-[#138808]/80" />
      <div className="container relative flex h-16 items-center justify-between">
        <Link href="/" className="group inline-flex items-center gap-3">
          {/* <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 shadow-sm sm:h-12 sm:w-12">
            <Image
              src="/logo.svg"
              alt="Linkup Legal"
              width={28}
              height={28}
              priority
              sizes="28px"
              className="h-7 w-7 object-contain"
            />
          </span> */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Linkup Legal"
              width={42}
              height={42}
              sizes="42px"
              priority
              className="h-10 w-10 object-contain"
            />
          </div>
          <span className="text-2xl font-heading font-black tracking-tight text-primary">
            Linkup Legal
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              link.path === "/#how-it-works"
                ? pathname === "/"
                : pathname === link.path;
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <form onSubmit={handleSearchSubmit} className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() =>
                window.setTimeout(() => setShowSuggestions(false), 120)
              }
              placeholder="Search services..."
              aria-label="Search services"
              className="h-10 w-full rounded-full border border-white/60 bg-white/70 pl-9 pr-3 text-sm text-foreground outline-none shadow-sm transition-all duration-200 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-white/60 bg-white/90 shadow-xl backdrop-blur-xl">
                {suggestions.map((service, index) => (
                  <button
                    key={service.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleSuggestionClick(
                        service.slug,
                        index,
                        "navbar_desktop_search",
                      )
                    }
                    className="flex w-full items-center gap-3 border-b border-white/70 px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                  >
                    <NavbarSuggestionIcon icon={service.icon} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {service.title}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {service.category}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>
          <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-2 py-1 shadow-sm backdrop-blur-md">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
              aria-label={t.navbar.languageLabel}
              className="bg-transparent text-sm text-foreground outline-none"
            >
              <option value="en">{t.navbar.english}</option>
              <option value="hi">{t.navbar.hindi}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            className="rounded-full p-2 hover:bg-white/60"
            onClick={() => {
              setMobileSearchOpen((prev) => !prev);
              setMobileOpen(false);
            }}
            aria-label="Toggle mobile search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 hover:bg-white/60"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setMobileSearchOpen(false);
            }}
            aria-label={t.navbar.toggleMenu}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-white/40 bg-white/80 p-4 backdrop-blur-2xl md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() =>
                window.setTimeout(() => setShowSuggestions(false), 120)
              }
              placeholder="Search services..."
              aria-label="Search services"
              className="h-10 w-full rounded-full border border-white/60 bg-white/80 pl-9 pr-3 text-sm text-foreground outline-none shadow-sm transition-all duration-200 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-white/60 bg-white/95 shadow-xl backdrop-blur-xl">
                {suggestions.map((service, index) => (
                  <button
                    key={service.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleSuggestionClick(
                        service.slug,
                        index,
                        "navbar_mobile_search",
                      )
                    }
                    className="flex w-full items-center gap-3 border-b border-white/70 px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                  >
                    <NavbarSuggestionIcon icon={service.icon} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {service.title}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {service.category}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>
        </div>
      )}

      {mobileOpen && (
        <div className="border-t border-white/40 bg-white/80 p-4 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/70 hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
                aria-label={t.navbar.languageLabel}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              >
                <option value="en">{t.navbar.english}</option>
                <option value="hi">{t.navbar.hindi}</option>
              </select>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ServiceCard from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { trackSearch } from "@/lib/analytics/meta-browser";
import type { ServiceCardItem, ServiceSuggestionItem } from "@/types/service";
import { useLanguage } from "@/context/language-context";
import { getServiceIcon } from "@/components/services/service-icons";

const ITEMS_PER_PAGE = 24;
const SEARCH_DEBOUNCE_MS = 320;
const SUGGESTION_DEBOUNCE_MS = 300;
const EMPTY_SUGGESTION_DEBOUNCE_MS = 120;
const SUGGESTION_LIMIT = 5;

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  pages: number;
};

type ServicesClientProps = {
  initialServices: ServiceCardItem[];
  initialPagination: PaginationMeta;
  categories: string[];
  initialCategory?: string;
  initialSearch?: string;
};

type ServicesPageState = {
  services: ServiceCardItem[];
  pagination: PaginationMeta;
};

type ServicesApiResponse = {
  services?: ServiceCardItem[];
  pagination?: PaginationMeta;
};

type SuggestionsApiResponse = {
  services?: ServiceSuggestionItem[];
};

const servicesPageCache = new Map<string, ServicesPageState>();
const suggestionsCache = new Map<string, ServiceSuggestionItem[]>();

function buildServicesPageKey(query: string, category: string, page: number, limit: number): string {
  return `${category.trim().toLowerCase()}::${query.trim().toLowerCase()}::${page}::${limit}`;
}

function buildSuggestionKey(query: string, category: string): string {
  return `${category.trim().toLowerCase()}::${query.trim().toLowerCase()}`;
}

function buildServicesUrl(query: string, category: string, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (query) params.set("query", query);
  if (category && category !== "All") params.set("category", category);

  return `/api/services?${params.toString()}`;
}

function buildSuggestionsUrl(query: string, category: string): string {
  const params = new URLSearchParams();
  params.set("scope", "suggestions");
  params.set("limit", String(SUGGESTION_LIMIT));
  if (query) params.set("query", query);
  if (category && category !== "All") params.set("category", category);

  return `/api/services?${params.toString()}`;
}

function normalizePagination(pagination: PaginationMeta | undefined, fallbackPage: number): PaginationMeta {
  const page = Math.max(1, pagination?.page ?? fallbackPage);
  const limit = Math.max(1, pagination?.limit ?? ITEMS_PER_PAGE);
  const total = Math.max(0, pagination?.total ?? 0);

  return {
    page,
    limit,
    total,
    hasMore: Boolean(pagination?.hasMore),
    pages: Math.max(1, pagination?.pages ?? Math.ceil(total / limit)),
  };
}

function getUrlParam(searchParams: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) return value;
  }

  return "";
}

async function fetchServicesPage(
  query: string,
  category: string,
  page: number,
  signal: AbortSignal
): Promise<ServicesPageState> {
  const key = buildServicesPageKey(query, category, page, ITEMS_PER_PAGE);
  const cached = servicesPageCache.get(key);
  if (cached) return cached;

  const response = await fetch(buildServicesUrl(query, category, page, ITEMS_PER_PAGE), {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load services: ${response.status}`);
  }

  const payload = (await response.json()) as ServicesApiResponse;
  const services = Array.isArray(payload.services) ? payload.services : [];
  const pagination = normalizePagination(payload.pagination, page);
  const nextState = { services, pagination };
  servicesPageCache.set(key, nextState);
  return nextState;
}

async function fetchSuggestions(
  query: string,
  category: string,
  signal: AbortSignal
): Promise<ServiceSuggestionItem[]> {
  const key = buildSuggestionKey(query, category);
  const cached = suggestionsCache.get(key);
  if (cached) return cached;

  const response = await fetch(buildSuggestionsUrl(query, category), {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load service suggestions: ${response.status}`);
  }

  const payload = (await response.json()) as SuggestionsApiResponse;
  const services = Array.isArray(payload.services) ? payload.services : [];
  suggestionsCache.set(key, services);
  return services;
}

function SuggestionIcon({ icon }: { icon?: string | null }) {
  const Icon = getServiceIcon(icon ?? "");

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function ServicesClient({
  initialServices,
  initialPagination,
  categories,
  initialCategory = "All",
  initialSearch = "",
}: ServicesClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPagination.page);
  const [services, setServices] = useState(initialServices);
  const [pagination, setPagination] = useState(initialPagination);
  const [suggestions, setSuggestions] = useState<ServiceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const deferredSearch = useDeferredValue(search);
  const lastTrackedSearchRef = useRef("");
  const hasHandledInitialFilterRef = useRef(false);
  const hasAppliedUrlStateRef = useRef(false);

  const searchTerm = deferredSearch.trim().toLowerCase();
  const totalPages = Math.max(1, pagination.pages);

  useEffect(() => {
    const key = buildServicesPageKey(
      initialSearch.trim().toLowerCase(),
      initialCategory,
      initialPagination.page,
      initialPagination.limit
    );

    servicesPageCache.set(key, {
      services: initialServices,
      pagination: initialPagination,
    });
  }, [initialCategory, initialPagination, initialSearch, initialServices]);

  useEffect(() => {
    if (hasAppliedUrlStateRef.current) return;
    hasAppliedUrlStateRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlSearch = getUrlParam(params, ["search", "query", "q"]).trim();
    const urlCategory = getUrlParam(params, ["category"]).trim();

    if (urlSearch && urlSearch !== search) {
      setSearch(urlSearch);
    }

    if (urlCategory && categories.includes(urlCategory) && urlCategory !== activeCategory) {
      setActiveCategory(urlCategory);
    }
  }, [activeCategory, categories, search]);

  useEffect(() => {
    if (!hasHandledInitialFilterRef.current) {
      hasHandledInitialFilterRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    const key = buildServicesPageKey(searchTerm, activeCategory, currentPage, ITEMS_PER_PAGE);
    const cached = servicesPageCache.get(key);
    if (cached) {
      setServices(cached.services);
      setPagination(cached.pagination);
      setLoadError("");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const debounceMs = searchTerm.length > 0 ? SEARCH_DEBOUNCE_MS : 80;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError("");

      void fetchServicesPage(searchTerm, activeCategory, currentPage, controller.signal)
        .then((nextState) => {
          setServices(nextState.services);
          setPagination(nextState.pagination);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          console.error("Failed to load services page.", error);
          setLoadError("Services could not be loaded. Please try again.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeCategory, currentPage, searchTerm]);

  useEffect(() => {
    if (!showSuggestions) return;
    if (search.trim().length > 0 && search.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const suggestionQuery = search.trim().length >= 2 ? search.trim().toLowerCase() : "";
    const key = buildSuggestionKey(suggestionQuery, activeCategory);
    const cached = suggestionsCache.get(key);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void fetchSuggestions(suggestionQuery, activeCategory, controller.signal)
          .then(setSuggestions)
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            console.error("Failed to load service suggestions.", error);
            setSuggestions([]);
          });
      },
      suggestionQuery ? SUGGESTION_DEBOUNCE_MS : EMPTY_SUGGESTION_DEBOUNCE_MS
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeCategory, search, showSuggestions]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (searchTerm.length < 2) {
      lastTrackedSearchRef.current = "";
      return;
    }

    const key = `${activeCategory}:${searchTerm}`;
    const timer = window.setTimeout(() => {
      if (lastTrackedSearchRef.current === key) return;

      lastTrackedSearchRef.current = key;
      trackSearch({
        search_string: searchTerm,
        surface: "services_page_search",
        mode: "input",
        active_category: activeCategory,
        result_count: pagination.total,
      });
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeCategory, pagination.total, searchTerm]);

  useEffect(() => {
    if (searchTerm.length < 2) return;
    if (showSuggestions) return;

    lastTrackedSearchRef.current = "";
  }, [searchTerm.length, showSuggestions]);

  const handleSuggestionSelect = (slug: string, index: number) => {
    setShowSuggestions(false);
    trackSearch({
      search_string: searchTerm,
      surface: "services_page_search",
      mode: "select",
      active_category: activeCategory,
      selected_service_slug: slug,
      result_rank: index + 1,
      result_count: pagination.total,
    });
    router.push(`/services/${slug}`);
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuggestions(false);

    if (searchTerm.length >= 2 && suggestions.length > 0) {
      handleSuggestionSelect(suggestions[0].slug, 0);
      return;
    }

    setCurrentPage(1);
    if (searchTerm.length > 0) {
      trackSearch({
        search_string: searchTerm,
        surface: "services_page_search",
        mode: "submit",
        active_category: activeCategory,
        result_count: pagination.total,
      });
    }
  };

  const visiblePageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground md:text-4xl">{t.servicesPage.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.servicesPage.description}</p>
      </div>

      <div className="mb-8 rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur md:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground">Search Services</p>
          <p className="text-sm text-muted-foreground">Find a service quickly by name, document, or feature.</p>
        </div>

        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.servicesPage.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              className="h-12 rounded-xl border-border bg-background pl-12 pr-12 shadow-sm"
              aria-label="Search services"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-busy={isLoading}
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSuggestions([]);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-background shadow-lg"
              role="listbox"
            >
              {suggestions.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSuggestionSelect(service.slug, index)}
                  className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                >
                  <SuggestionIcon icon={service.icon} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{service.title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{service.category}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSearch("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              aria-pressed={activeCategory === cat}
              aria-label={`Filter by ${cat}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          Loading services...
        </p>
      ) : null}

      {loadError ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg font-medium">{loadError}</p>
        </div>
      ) : services.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} surface="services_grid" />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg font-medium">{t.servicesPage.noServices}</p>
          <p className="mt-1 text-sm">{t.servicesPage.tryAdjusting}</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          {visiblePageNumbers.map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(page)}
              disabled={isLoading}
              aria-current={page === currentPage ? "page" : undefined}
              className="min-w-10"
            >
              {page}
            </Button>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  );
}

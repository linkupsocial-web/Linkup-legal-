import "server-only";
import { unstable_cache as cache } from "next/cache";
import type { Service, ServiceCardItem, ServiceSuggestionItem } from "@/types/service";
import { getServices, type ServiceListFilters } from "./services.service";

export const PUBLIC_SERVICES_DEFAULT_LIMIT = 24;
export const PUBLIC_SERVICES_MAX_LIMIT = 24;
export const PUBLIC_SERVICE_SUGGESTION_LIMIT = 5;
export const PUBLIC_SERVICE_SUGGESTION_MAX_LIMIT = 8;

export type SearchParams = {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export type SearchResponse = {
  items: ServiceCardItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  pages: number;
};

export type SuggestionSearchParams = {
  q?: string;
  category?: string;
  limit?: number;
};

export type SuggestionSearchResponse = {
  items: ServiceSuggestionItem[];
};

function normalizeSearchParams(params: SearchParams) {
  return {
    q: params.q?.trim().toLowerCase() ?? "",
    category: params.category ?? "All",
    page: Math.max(1, params.page ?? 1),
    pageSize: Math.min(PUBLIC_SERVICES_MAX_LIMIT, Math.max(1, params.pageSize ?? PUBLIC_SERVICES_DEFAULT_LIMIT)),
  };
}

function normalizeSuggestionParams(params: SuggestionSearchParams) {
  return {
    q: params.q?.trim().toLowerCase() ?? "",
    category: params.category ?? "All",
    limit: Math.min(
      PUBLIC_SERVICE_SUGGESTION_MAX_LIMIT,
      Math.max(1, params.limit ?? PUBLIC_SERVICE_SUGGESTION_LIMIT)
    ),
  };
}

function toServiceCardItem(service: Service): ServiceCardItem {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.description,
    category: service.category,
    icon: service.icon,
    image: service.image,
    duration: service.duration,
    ...(service.popular ? { popular: service.popular } : {}),
  };
}

function toServiceSuggestionItem(service: Service): ServiceSuggestionItem {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    category: service.category,
    icon: service.icon,
  };
}

function getSuggestionRank(service: Service, query: string): number {
  if (!query) return service.popular ? 0 : 1;

  const title = service.title.toLowerCase();
  const category = service.category.toLowerCase();

  if (title.startsWith(query)) return 0;
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (title.includes(query)) return 2;
  if (category.includes(query)) return 3;
  return 4;
}

export async function searchServices(params: SearchParams): Promise<SearchResponse> {
  const normalized = normalizeSearchParams(params);
  const key = `q:${normalized.q}|category:${normalized.category}|page:${normalized.page}|size:${normalized.pageSize}`;

  const cachedSearch = cache(
    async (): Promise<SearchResponse> => {
      const filters: ServiceListFilters = {
        search: normalized.q,
        category: normalized.category,
      };

      const matched = await getServices(filters);
      const start = (normalized.page - 1) * normalized.pageSize;
      const items = matched.slice(start, start + normalized.pageSize).map(toServiceCardItem);

      return {
        items,
        total: matched.length,
        page: normalized.page,
        pageSize: normalized.pageSize,
        hasMore: start + normalized.pageSize < matched.length,
        pages: Math.max(1, Math.ceil(matched.length / normalized.pageSize)),
      };
    },
    [`services-search-${key}`],
    { revalidate: 60, tags: ["services", "services-search"] }
  );

  return cachedSearch();
}

export async function searchServiceSuggestions(params: SuggestionSearchParams): Promise<SuggestionSearchResponse> {
  const normalized = normalizeSuggestionParams(params);
  const key = `q:${normalized.q}|category:${normalized.category}|limit:${normalized.limit}`;

  const cachedSearch = cache(
    async (): Promise<SuggestionSearchResponse> => {
      const filters: ServiceListFilters = {
        search: normalized.q,
        category: normalized.category,
      };

      const matched = await getServices(filters);
      const items = matched
        .slice()
        .sort((left, right) => {
          const rankDiff = getSuggestionRank(left, normalized.q) - getSuggestionRank(right, normalized.q);
          if (rankDiff !== 0) return rankDiff;
          return left.title.localeCompare(right.title);
        })
        .slice(0, normalized.limit)
        .map(toServiceSuggestionItem);

      return { items };
    },
    [`services-suggestions-${key}`],
    { revalidate: 60, tags: ["services", "services-search"] }
  );

  return cachedSearch();
}

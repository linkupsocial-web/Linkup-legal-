import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServices } from "@/server/services.service";
import {
  PUBLIC_SERVICE_SUGGESTION_LIMIT,
  PUBLIC_SERVICE_SUGGESTION_MAX_LIMIT,
  PUBLIC_SERVICES_DEFAULT_LIMIT,
  PUBLIC_SERVICES_MAX_LIMIT,
  searchServiceSuggestions,
  searchServices,
} from "@/server/search.service";
import { SERVICES_REVALIDATE_SECONDS, ServiceCatalogUnavailableError } from "@/server/services.datasource";

const PUBLIC_LIST_PARAMS = ["query", "q", "search", "category", "page", "limit"];

function getFirstParam(searchParams: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) return value;
  }

  return "";
}

function sanitizeTextParam(value: string, maxLength = 100): string {
  return value.trim().slice(0, maxLength);
}

function parseBoundedInteger(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(1, parsed));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scope = searchParams.get("scope");

    if (scope === "suggestions") {
      const query = sanitizeTextParam(getFirstParam(searchParams, ["query", "q", "search"]));
      const category = sanitizeTextParam(searchParams.get("category") ?? "All");
      const limit = parseBoundedInteger(
        searchParams.get("limit"),
        PUBLIC_SERVICE_SUGGESTION_LIMIT,
        PUBLIC_SERVICE_SUGGESTION_MAX_LIMIT
      );
      const suggestions = await searchServiceSuggestions({ q: query, category, limit });

      return NextResponse.json(
        { services: suggestions.items },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${SERVICES_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
          },
        }
      );
    }

    const hasPublicListParams = PUBLIC_LIST_PARAMS.some((param) => searchParams.has(param));
    if (hasPublicListParams) {
      const query = sanitizeTextParam(getFirstParam(searchParams, ["query", "q", "search"]));
      const category = sanitizeTextParam(searchParams.get("category") ?? "All");
      const page = parseBoundedInteger(searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER);
      const limit = parseBoundedInteger(
        searchParams.get("limit"),
        PUBLIC_SERVICES_DEFAULT_LIMIT,
        PUBLIC_SERVICES_MAX_LIMIT
      );
      const results = await searchServices({ q: query, category, page, pageSize: limit });

      return NextResponse.json(
        {
          services: results.items,
          pagination: {
            page: results.page,
            limit: results.pageSize,
            total: results.total,
            hasMore: results.hasMore,
            pages: results.pages,
          },
        },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${SERVICES_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
          },
        }
      );
    }

    const services = await getServices();
    const searchIndex = services.map((service) => ({
      id: service.id,
      slug: service.slug,
      title: service.title,
      description: service.description,
      category: service.category,
      icon: service.icon,
      image: service.image,
      price: service.price,
    }));

    return NextResponse.json(
      { services: searchIndex },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${SERVICES_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
        },
      }
    );
  } catch (error) {
    if (error instanceof ServiceCatalogUnavailableError) {
      return NextResponse.json(
        { error: "Service catalog is temporarily unavailable.", code: "SERVICE_CATALOG_UNAVAILABLE" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    throw error;
  }
}

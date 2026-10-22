export type QueryValue = string | string[] | undefined;
export type QueryParams = Record<string, QueryValue> | undefined;

export type ServicesQuery = {
  q: string;
  category: string;
  page: number;
};

export type LinkItem = {
  label: string;
  href: string;
  active?: boolean;
};

function firstValue(value: QueryValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function normalizeServicesQuery(searchParams?: QueryParams): ServicesQuery {
  const q = firstValue(searchParams?.q).trim();
  const category = firstValue(searchParams?.category).trim() || "All";
  const rawPage = Number.parseInt(firstValue(searchParams?.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, category, page };
}

export function buildServicesHref(
  basePath: string,
  params: {
    q?: string;
    category?: string;
    page?: number;
  }
): string {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.category?.trim() && params.category !== "All") {
    searchParams.set("category", params.category.trim());
  }

  if (typeof params.page === "number" && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

type CacheConfig = {
  revalidate?: number;
  tags?: string[];
};

type FetcherOptions = Omit<RequestInit, "next"> & {
  cacheConfig?: CacheConfig;
};

export class FetcherError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "FetcherError";
    this.status = status;
    this.url = url;
  }
}

async function request<T>(url: string, options?: FetcherOptions): Promise<T> {
  const { cacheConfig, ...rest } = options ?? {};

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    next: cacheConfig
      ? {
          revalidate: cacheConfig.revalidate,
          tags: cacheConfig.tags,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new FetcherError(`Request failed with status ${response.status}`, response.status, url);
  }

  return (await response.json()) as T;
}

export async function getJson<T>(url: string, cacheConfig?: CacheConfig): Promise<T> {
  return request<T>(url, { method: "GET", cacheConfig });
}

export async function postJson<TResponse, TBody>(url: string, body: TBody, cacheConfig?: CacheConfig): Promise<TResponse> {
  return request<TResponse>(url, {
    method: "POST",
    body: JSON.stringify(body),
    cacheConfig,
  });
}

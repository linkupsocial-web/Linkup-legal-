function normalizeSiteUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return normalizeSiteUrl(raw);
}

export function toAbsoluteUrl(path: string): string {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return path;
  return new URL(path, siteUrl).toString();
}

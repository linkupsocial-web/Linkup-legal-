import type { MetadataRoute } from "next";
import { getCategorySlugs, getServiceSlugs } from "@/server/services.service";
import { getSiteUrl } from "@/lib/site-url";

const CANONICAL_SITE_URL = "https://www.linkuplegal.com";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

function getCanonicalBaseUrl(): string {
  const configuredUrl = getSiteUrl();
  if (!configuredUrl) return CANONICAL_SITE_URL;

  const hostname = new URL(configuredUrl).hostname;
  return LOCAL_HOSTNAMES.has(hostname) ? CANONICAL_SITE_URL : configuredUrl;
}

const baseUrl = getCanonicalBaseUrl();

function absoluteUrl(path: string): string {
  return new URL(path, baseUrl).toString();
}

function createRoute(
  path: string,
  lastModified: Date,
  changeFrequency: ChangeFrequency,
  priority: number
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

function encodeSlugSegment(segment: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

function normalizeSlug(slug: string): string | null {
  const cleanedSlug = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!cleanedSlug) return null;

  return cleanedSlug
    .split("/")
    .filter(Boolean)
    .map(encodeSlugSegment)
    .join("/");
}

function uniqueSlugs(slugs: string[]): string[] {
  return Array.from(new Set(slugs.map(normalizeSlug).filter((slug): slug is string => Boolean(slug))));
}

async function safelyLoadServiceSlugs(): Promise<string[]> {
  try {
    return uniqueSlugs(await getServiceSlugs());
  } catch {
    return [];
  }
}

async function safelyLoadCategorySlugs(): Promise<string[]> {
  try {
    const categories = await getCategorySlugs();
    return uniqueSlugs(categories.map((category) => category.slug));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const [serviceSlugs, categorySlugs] = await Promise.all([
    safelyLoadServiceSlugs(),
    safelyLoadCategorySlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    createRoute("/", lastModified, "daily", 1),
    createRoute("/services", lastModified, "daily", 0.95),
    createRoute("/privacy-policy", lastModified, "monthly", 0.3),
  ];

const serviceRoutes: MetadataRoute.Sitemap = serviceSlugs
  .sort()
  .map((slug) =>
    createRoute(`/services/${slug}`, lastModified, "weekly", 0.9)
  );

const categoryRoutes: MetadataRoute.Sitemap = categorySlugs
  .sort()
  .map((slug) =>
    createRoute(`/services/category/${slug}`, lastModified, "weekly", 0.8)
  );

  
  return [...staticRoutes, ...serviceRoutes, ...categoryRoutes];
}

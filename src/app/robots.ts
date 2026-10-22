import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const CANONICAL_SITE_URL = "https://www.linkuplegal.com";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function getCanonicalBaseUrl(): string {
  const configuredUrl = getSiteUrl();
  if (!configuredUrl) return CANONICAL_SITE_URL;

  const hostname = new URL(configuredUrl).hostname;
  return LOCAL_HOSTNAMES.has(hostname) ? CANONICAL_SITE_URL : configuredUrl;
}

const baseUrl = getCanonicalBaseUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/crm/",
          "/admin/",
          "/*?*",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl,
  };
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdLandingPage, type AdLandingPageSlug } from "@/data/ad-landing-pages";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import AdLandingPageClient from "./AdLandingPageClient";

const siteUrl = getSiteUrl();

export function getAdLandingMetadata(slug: AdLandingPageSlug): Metadata {
  const page = getAdLandingPage(slug);
  if (!page) return {};

  return {
    title: { absolute: page.seo.title },
    description: page.seo.description,
    alternates: { canonical: page.seo.canonical },
    robots: {
      index: !page.seo.noindex,
      follow: true,
      googleBot: {
        index: !page.seo.noindex,
        follow: true,
      },
    },
    openGraph: {
      title: page.seo.title,
      description: page.seo.description,
      ...(siteUrl ? { url: toAbsoluteUrl(page.seo.canonical) } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.seo.title,
      description: page.seo.description,
    },
  };
}

export default function AdLandingRoute({ slug }: { slug: AdLandingPageSlug }) {
  const page = getAdLandingPage(slug);
  if (!page) notFound();

  return <AdLandingPageClient page={page} />;
}

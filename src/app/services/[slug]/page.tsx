import { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/layout/Layout";
import ServiceDetailClient from "./ServiceDetailClient";
import { resolveHcaptchaSiteKey } from "@/lib/hcaptcha-site-key";
import { getServiceBySlug, getServiceSlugs } from "@/server/services.service";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };
const siteUrl = getSiteUrl();
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) {
    return {
      title: "Service Not Found | Linkup Legal",
      description: "The requested legal or government service page could not be found on Linkup Legal.",
    };
  }
  const serviceKeywords = [
    service.title,
    `${service.title} in India`,
    `${service.category} services`,
    "legal services India",
    "government services India",
    "expert compliance support",
  ];

  const detailedDescription = `${service.description} Expert support for documentation, filing, and end-to-end assistance across India.`;
  const imageUrl = service.image.trim() ? toAbsoluteUrl(service.image.trim()) : undefined;

  return {
    title: `${service.title} in India | Linkup Legal`,
    description: detailedDescription,
    keywords: serviceKeywords,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title: `${service.title} Service — Linkup Legal`,
      description: detailedDescription,
      ...(siteUrl ? { url: toAbsoluteUrl(`/services/${service.slug}`) } : {}),
      ...(imageUrl ? { images: [{ url: imageUrl, alt: service.title }] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.title} | Linkup Legal`,
      description: detailedDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const serviceUrl = toAbsoluteUrl(`/services/${service.slug}`);
  const servicesUrl = toAbsoluteUrl("/services");
  const homeUrl = toAbsoluteUrl("/");
  const imageUrl = service.image.trim() ? toAbsoluteUrl(service.image.trim()) : undefined;
  const legalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: service.title,
    description: service.description,
    ...(imageUrl ? { image: imageUrl } : {}),
    provider: {
      "@type": "Organization",
      name: "Linkup Legal",
      ...(siteUrl ? { url: siteUrl } : {}),
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: service.price,
      availability: "https://schema.org/InStock",
      url: serviceUrl,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: servicesUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.title,
        item: serviceUrl,
      },
    ],
  };

  const scripts = {
    "@context": "https://schema.org",
    "@graph": [legalServiceSchema, breadcrumbSchema],
  };
  // hCaptcha site keys are public by design. Keep the configured server-only
  // name compatible while preferring the standard NEXT_PUBLIC_* setting.
  const hcaptchaSiteKey = resolveHcaptchaSiteKey(
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
    process.env.HCAPTCHA_SITE_KEY
  );

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scripts) }} />
      <ServiceDetailClient service={service} hcaptchaSiteKey={hcaptchaSiteKey} />
    </Layout>
  );
}

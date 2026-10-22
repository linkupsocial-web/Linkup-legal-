import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import { Skeleton } from "@/components/ui/skeleton";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import { getHomepageServiceCategories } from "@/server/services.service";

const PopularServicesSection = dynamicImport(() => import("@/components/home/PopularServicesSection"), {
  loading: () => <Skeleton className="container my-12 h-80 w-full" />,
});

const HowItWorksSection = dynamicImport(() => import("@/components/home/HowItWorksSection"), {
  loading: () => <Skeleton className="container my-12 h-72 w-full" />,
});

const TrustSection = dynamicImport(() => import("@/components/home/TrustSection"), {
  loading: () => <Skeleton className="container my-10 h-64 w-full" />,
});

const CtaSection = dynamicImport(() => import("@/components/home/CtaSection"), {
  loading: () => <Skeleton className="container my-12 h-56 w-full" />,
});

const GoogleReviewSection = dynamicImport(() => import("@/components/home/GoogleReviewSection"), {
  loading: () => <Skeleton className="container my-12 h-48 w-full" />,
});

const siteUrl = getSiteUrl();
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Online Legal & Government Services in India | Linkup Legal",
  description:
    "Linkup Legal helps businesses and individuals in India with GST filing, company registration, licenses, tax, and compliance services with expert guidance.",
  keywords: [
    "online legal services India",
    "government services online",
    "GST registration",
    "company incorporation",
    "compliance support",
    "tax filing services",
    "license assistance India",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Legal & Government Services Platform in India | Linkup Legal",
    description:
      "Get expert support for GST, registration, licensing, tax filing, and compliance services across India.",
    ...(siteUrl ? { url: siteUrl } : {}),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Legal & Compliance Help in India | Linkup Legal",
    description:
      "Fast and affordable support for GST, registration, licenses, and compliance services in India.",
  },
};

export default async function HomePage() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Linkup Legal",
    ...(siteUrl ? { url: siteUrl } : {}),
    ...(siteUrl ? { logo: toAbsoluteUrl("/logo.svg") } : {}),
    ...(siteUrl ? { image: toAbsoluteUrl("/logo.svg") } : {}),
    description:
      "Government and business services platform helping users complete compliance and registration tasks quickly.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Linkup Legal",
    ...(siteUrl ? { url: siteUrl } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: `${toAbsoluteUrl("/services")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const serviceCategories = await getHomepageServiceCategories();

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <HeroSection />
      <PopularServicesSection categories={serviceCategories} />
      <HowItWorksSection />
      <TrustSection />
      <CtaSection />
      <GoogleReviewSection />
    </Layout>
  );
}

import { Metadata } from "next";
import Layout from "@/components/layout/Layout";
import ServicesClient from "./ServicesClient";
import { PUBLIC_SERVICES_DEFAULT_LIMIT, searchServices } from "@/server/search.service";
import { getServiceCategories } from "@/server/services.service";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Legal & Government Services in India | Linkup Legal",
  description:
    "Explore legal and government services in India including company registration, GST filing, licenses, and compliance. Fast, affordable expert support.",
  keywords: [
    "legal services India",
    "government services India",
    "company registration",
    "GST filing",
    "compliance services",
    "license services",
    "trademark registration",
  ],
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "All Legal Services — Linkup Legal",
    description:
      "Get expert help for company registration, GST, trademark, licenses, and compliance services across India.",
    ...(siteUrl ? { url: toAbsoluteUrl("/services") } : {}),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Legal Services Made Easy | Linkup Legal",
    description:
      "Company registration, GST, trademark and more. Fast, affordable, expert legal services in India.",
  },
};

export default async function ServicesPage() {
  const [results, categories] = await Promise.all([
    searchServices({
      page: 1,
      pageSize: PUBLIC_SERVICES_DEFAULT_LIMIT,
    }),
    getServiceCategories(),
  ]);

  return (
    <Layout>
      <ServicesClient
        initialServices={results.items}
        categories={categories}
        initialPagination={{
          page: results.page,
          limit: results.pageSize,
          total: results.total,
          hasMore: results.hasMore,
          pages: results.pages,
        }}
      />
    </Layout>
  );
}

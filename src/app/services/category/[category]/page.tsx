import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/layout/Layout";
import ServicesClient from "@/app/services/ServicesClient";
import {
  getCategorySlugs,
  resolveCategorySlug,
} from "@/server/services.service";
import { PUBLIC_SERVICES_DEFAULT_LIMIT, searchServices } from "@/server/search.service";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
export const revalidate = 60;

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  const categories = await getCategorySlugs();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryName = await resolveCategorySlug(category);
  if (!categoryName) {
    return {
      title: "Category Not Found | Linkup Legal",
      description: "The requested legal or government service category could not be found on Linkup Legal.",
    };
  }

  const categoryLower = categoryName.toLowerCase();
  const categoryDescription = `Explore ${categoryLower} services in India with expert support for documentation, filing, and compliance. Fast, affordable, and reliable service assistance.`;

  return {
    title: `${categoryName} Services in India | Linkup Legal`,
    description: categoryDescription,
    keywords: [
      `${categoryName} services`,
      `${categoryName} services in India`,
      "legal services India",
      "government services India",
      "online compliance support",
    ],
    alternates: {
      canonical: `/services/category/${category}`,
    },
    openGraph: {
      title: `${categoryName} Legal Services — Linkup Legal`,
      description: categoryDescription,
      ...(siteUrl ? { url: toAbsoluteUrl(`/services/category/${category}`) } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} Services in India | Linkup Legal`,
      description: categoryDescription,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName = await resolveCategorySlug(category);
  if (!categoryName) notFound();

  const initialResults = await searchServices({
    category: categoryName,
    page: 1,
    pageSize: PUBLIC_SERVICES_DEFAULT_LIMIT,
  });

  return (
    <Layout>
      <ServicesClient
        initialServices={initialResults.items}
        categories={[categoryName]}
        initialPagination={{
          page: initialResults.page,
          limit: initialResults.pageSize,
          total: initialResults.total,
          hasMore: initialResults.hasMore,
          pages: initialResults.pages,
        }}
        initialCategory={categoryName}
      />
    </Layout>
  );
}

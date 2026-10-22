import { getCategorySlug, normalizeCategoryName } from "../../lib/service-categories";
import { normalizeServiceImage, normalizeJsonStringArray } from "../../lib/service-content";
import { normalizeServiceStatus } from "../../lib/service-status";
import { normalizeServicePricingType } from "../../lib/service-pricing";
import type { Service } from "../../types/service";

export type SupabaseServiceRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  category_slug: string | null;
  icon: string | null;
  image: string | null;
  price: number | string | null;
  pricing_type?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  price_note?: string | null;
  duration: string | null;
  customers_served: number | null;
  features: unknown;
  required_documents: unknown;
  status: string | null;
  priority: number | null;
  popular: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapSupabaseServiceRow(row: SupabaseServiceRow): Service {
  const title = row.title.trim();
  const category = normalizeCategoryName(row.category?.trim() || "Government Services");

  const price = Math.max(0, Math.trunc(toNumber(row.price)));

  return {
    id: row.id,
    slug: row.slug,
    title,
    description: row.description?.trim() || `Get expert assistance for ${title.toLowerCase()}.`,
    category,
    categorySlug: row.category_slug?.trim() || getCategorySlug(category),
    icon: row.icon?.trim() || "FileText",
    image: normalizeServiceImage(row.image),
    price,
    pricingType: normalizeServicePricingType(row.pricing_type, price),
    priceMin: row.price_min === null || row.price_min === undefined ? null : Math.max(0, Math.trunc(toNumber(row.price_min))),
    priceMax: row.price_max === null || row.price_max === undefined ? null : Math.max(0, Math.trunc(toNumber(row.price_max))),
    priceNote: row.price_note?.trim() || null,
    duration: row.duration?.trim() || "3-7 days",
    customersServed: Math.max(0, Math.trunc(toNumber(row.customers_served))),
    requiredDocuments: normalizeJsonStringArray(row.required_documents),
    features: normalizeJsonStringArray(row.features),
    popular: Boolean(row.popular),
    status: normalizeServiceStatus(row.status),
    priority: Math.trunc(toNumber(row.priority, 9999)),
  };
}

import type { Service } from "../types/service";
import { isPublicServiceStatus } from "./service-status";

export type ServiceCategorySummary = {
  title: string;
  slug: string;
  description: string;
  icon: string;
  count: number;
};

export const SERVICE_CATEGORY_ORDER = [
  "Business Registration",
  "Trademark & IP",
  "Tax Services",
  "Customer Segments",
  "Compliance",
  "Legal Services",
] as const;

const CATEGORY_DETAILS: Record<string, { slug: string; description: string; icon: string }> = {
  "Customer Segments": {
    slug: "customer-segments",
    description: "Service tracks tailored for startups, MSMEs, freelancers, sellers, NGOs, and professionals.",
    icon: "Users",
  },
  "Business Registration": {
    slug: "business-registration",
    description: "Company, LLP, OPC, partnership, proprietorship, and startup registration support.",
    icon: "Briefcase",
  },
  "Tax Services": {
    slug: "tax-services",
    description: "GST, income tax, TDS, and tax filing services for businesses and individuals.",
    icon: "Receipt",
  },
  "Trademark & IP": {
    slug: "trademark-ip",
    description: "Trademark, brand, copyright, and intellectual property filing assistance.",
    icon: "ShieldCheck",
  },
  "Legal Services": {
    slug: "legal-services",
    description: "Legal notices, agreements, documentation, and expert legal support.",
    icon: "Scale",
  },
  Compliance: {
    slug: "compliance",
    description: "Recurring filings, registrations, renewals, and statutory compliance support.",
    icon: "ClipboardCheck",
  },
};

function categoryKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getCategoryOrder(category: string): number {
  const index = SERVICE_CATEGORY_ORDER.findIndex((item) => item === category);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function normalizeCategoryName(category: string): string {
  const trimmed = category.trim().replace(/\s+/g, " ");
  const matched = SERVICE_CATEGORY_ORDER.find((item) => categoryKey(item) === categoryKey(trimmed));
  return matched ?? trimmed;
}

export function getCategorySlug(category: string): string {
  const normalized = normalizeCategoryName(category);
  const mapped = CATEGORY_DETAILS[normalized]?.slug;
  if (mapped) return mapped;

  return normalized
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isPublicVisibleService(service: Service): boolean {
  return isPublicServiceStatus(service.status);
}

export function getServicePriority(service: Service): number {
  return typeof service.priority === "number" && Number.isFinite(service.priority) ? service.priority : Number.MAX_SAFE_INTEGER;
}

export function sortServicesByPriority(left: Service, right: Service): number {
  const priorityDiff = getServicePriority(left) - getServicePriority(right);
  if (priorityDiff !== 0) return priorityDiff;
  return left.title.localeCompare(right.title);
}

export function sortCategoriesByRequiredOrder(left: string, right: string): number {
  const leftOrder = getCategoryOrder(normalizeCategoryName(left));
  const rightOrder = getCategoryOrder(normalizeCategoryName(right));

  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return normalizeCategoryName(left).localeCompare(normalizeCategoryName(right));
}

export function groupServicesByCategory(services: Service[], publicOnly = true): Map<string, Service[]> {
  const groups = new Map<string, Service[]>();
  const source = publicOnly ? services.filter(isPublicVisibleService) : services;

  for (const service of source) {
    const category = normalizeCategoryName(service.category);
    const current = groups.get(category) ?? [];
    current.push(service);
    groups.set(category, current);
  }

  for (const [category, categoryServices] of groups) {
    groups.set(category, categoryServices.slice().sort(sortServicesByPriority));
  }

  return groups;
}

export function getOrderedServiceCategories(services: Service[], includeAll = false): string[] {
  const categories = Array.from(groupServicesByCategory(services).keys()).sort(sortCategoriesByRequiredOrder);
  return includeAll ? ["All", ...categories] : categories;
}

export function getServiceCategorySummaries(services: Service[], requiredOnly = false): ServiceCategorySummary[] {
  const groups = groupServicesByCategory(services);

  return Array.from(groups.entries())
    .filter(([category]) => !requiredOnly || SERVICE_CATEGORY_ORDER.includes(category as (typeof SERVICE_CATEGORY_ORDER)[number]))
    .sort(([left], [right]) => sortCategoriesByRequiredOrder(left, right))
    .map(([category, categoryServices]) => {
      const firstService = categoryServices[0];
      const details = CATEGORY_DETAILS[category];

      return {
        title: category,
        slug: getCategorySlug(category),
        description: details?.description ?? `Explore ${category.toLowerCase()} services with expert support.`,
        icon: details?.icon || firstService?.icon || "FileText",
        count: categoryServices.length,
      };
    });
}

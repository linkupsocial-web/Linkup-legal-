import type { Service } from "../../types/service";
import { normalizeDelimitedServiceStringArray } from "../../lib/service-content";
import { normalizeServiceStatus } from "../../lib/service-status";

export interface CrmService extends Service {
  createdAt: string;
  updatedAt: string;
}

export type ServiceMutationInput = Partial<
  Pick<
    CrmService,
    "id" | "slug" | "image" | "popular" | "status" | "priority" | "pricingType" | "priceMin" | "priceMax" | "priceNote"
  >
> & {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  price?: number;
  duration?: string;
  customersServed?: number;
  requiredDocuments?: string[];
  features?: string[];
};

export type ServiceUpdatePatch = Partial<ServiceMutationInput>;
export type StoredCrmService = CrmService;

export const CRM_SERVICE_HEADERS = [
  "ID",
  "Slug",
  "Title",
  "Description",
  "Category",
  "Icon",
  "Image",
  "Price",
  "Duration",
  "Customers Served",
  "Required Documents",
  "Features",
  "Popular",
  "Status",
  "Priority",
  "Created At",
  "Updated At",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getField(record: Record<string, string>, aliases: string[]): string {
  const normalizedRecord = Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    const value = normalizedRecord[normalizeKey(alias)];
    if (value !== undefined) return value;
  }

  return "";
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1";
}

function parseInteger(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return fallback;

  const cleaned = value.replace(/,/g, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function csvField(record: Record<string, string>, aliases: string[]): string {
  return getField(record, aliases).trim();
}

export function parseCrmServiceImportRecord(record: Record<string, string>): ServiceMutationInput | null {
  const title = csvField(record, ["title", "service title", "service", "name"]);
  if (!title) return null;

  const priorityRaw = csvField(record, ["priority", "sort order", "rank", "service priority"]);
  const statusRaw = csvField(record, ["status", "service status"]);
  const slug = csvField(record, ["slug", "service slug"]) || slugify(title);

  return {
    id: csvField(record, ["id", "service id"]) || undefined,
    slug,
    title,
    description:
      csvField(record, ["description", "service description"]) || `Get expert assistance for ${title.toLowerCase()}.`,
    category: csvField(record, ["category", "service category"]) || "Government Services",
    icon: csvField(record, ["icon", "icon name"]) || "FileText",
    image: csvField(record, ["image", "service image", "image url", "image link", "thumbnail", "photo"]),
    price: parseInteger(csvField(record, ["price", "amount", "fee"])),
    duration: csvField(record, ["duration", "timeline", "turnaround time"]) || "3-7 days",
    customersServed: parseInteger(csvField(record, ["customersServed", "customers served", "served", "orders"])),
    requiredDocuments: normalizeDelimitedServiceStringArray(
      csvField(record, ["requiredDocuments", "required documents", "documents", "docs"])
    ),
    features: normalizeDelimitedServiceStringArray(csvField(record, ["features", "benefits", "highlights"])),
    popular: parseBoolean(csvField(record, ["popular", "is popular", "featured"])),
    status: normalizeServiceStatus(statusRaw),
    priority: parseInteger(priorityRaw, 9999),
  };
}

export function getServiceStats(source: CrmService[]) {
  const total = source.length;
  const active = source.filter((service) => service.status === "available" || !service.status).length;
  const comingSoon = source.filter((service) => service.status === "coming-soon").length;
  const disabled = source.filter((service) => service.status === "disabled").length;
  const popular = source.filter((service) => service.popular).length;

  return { total, active, comingSoon, disabled, popular };
}

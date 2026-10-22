import assert from "node:assert/strict";
import {
  SERVICE_CATEGORY_ORDER,
  getCategorySlug,
  getOrderedServiceCategories,
  getServiceCategorySummaries,
  groupServicesByCategory,
  normalizeCategoryName,
} from "./service-categories";
import type { Service } from "../types/service";

const baseService: Service = {
  id: "1",
  slug: "sample",
  title: "Sample",
  description: "Sample service",
  category: "Tax Services",
  categorySlug: "tax-services",
  icon: "ReceiptText",
  image: "",
  price: 0,
  duration: "3-7 days",
  customersServed: 0,
  requiredDocuments: [],
  features: [],
  status: "available",
  priority: 10,
};

const services: Service[] = [
  { ...baseService, id: "3", slug: "legal", title: "Legal", category: "Legal Services", priority: 2 },
  { ...baseService, id: "1", slug: "tax-high", title: "Tax High", category: "Tax Services", priority: 9 },
  { ...baseService, id: "2", slug: "tax-low", title: "Tax Low", category: "tax services", priority: 1 },
  { ...baseService, id: "4", slug: "disabled", title: "Disabled", category: "Compliance", status: "disabled" },
];

assert.equal(normalizeCategoryName(" trademark   & ip "), "Trademark & IP");
assert.equal(getCategorySlug("Trademark & IP"), "trademark-ip");
assert.equal(getCategorySlug("Business Registration"), "business-registration");

assert.deepEqual(SERVICE_CATEGORY_ORDER, [
  "Business Registration",
  "Trademark & IP",
  "Tax Services",
  "Customer Segments",
  "Compliance",
  "Legal Services",
]);

assert.deepEqual(getOrderedServiceCategories(services), ["Tax Services", "Legal Services"]);

const grouped = groupServicesByCategory(services);
assert.deepEqual(
  grouped.get("Tax Services")?.map((service) => service.slug),
  ["tax-low", "tax-high"]
);
assert.equal(grouped.has("Compliance"), false);

const summaries = getServiceCategorySummaries(services);
assert.deepEqual(
  summaries.map((summary) => ({ title: summary.title, slug: summary.slug, count: summary.count })),
  [
    { title: "Tax Services", slug: "tax-services", count: 2 },
    { title: "Legal Services", slug: "legal-services", count: 1 },
  ]
);

assert.deepEqual(
  getServiceCategorySummaries([
    ...services,
    { ...baseService, id: "5", slug: "other", title: "Other", category: "Other Category" },
  ], true).map((summary) => summary.title),
  ["Tax Services", "Legal Services"]
);

console.log("service-categories utilities: OK");

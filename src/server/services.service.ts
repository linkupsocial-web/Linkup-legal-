import "server-only";
import { revalidateTag } from "next/cache";
import type { Service } from "@/types/service";
import {
  getCategorySlug,
  getOrderedServiceCategories,
  getServiceCategorySummaries as buildServiceCategorySummaries,
  isPublicVisibleService,
  normalizeCategoryName,
  sortServicesByPriority,
  type ServiceCategorySummary,
} from "../lib/service-categories";
import {
  findAllServices,
  findServiceBySlug,
  findServiceIndex,
} from "./services.repository";

const revalidateTagCompat = revalidateTag as unknown as (tag: string, profile?: { expire: number }) => void;

export type ServiceListFilters = {
  category?: string;
  search?: string;
};

export function slugifyCategory(category: string): string {
  return getCategorySlug(category);
}

export async function resolveCategorySlug(categorySlug: string): Promise<string | null> {
  const categoryList = await getServiceCategories();
  return categoryList.find((category) => slugifyCategory(category) === categorySlug) ?? null;
}

export async function getServices(filters?: ServiceListFilters): Promise<Service[]> {
  const searchTerm = filters?.search?.trim().toLowerCase() ?? "";
  const categoryFilter = filters?.category ? normalizeCategoryName(filters.category) : "";
  const serviceIndex = await findServiceIndex();

  return serviceIndex
    .filter((item) => {
      const categoryOk =
        !categoryFilter || categoryFilter === "All" || normalizeCategoryName(item.category) === categoryFilter;
      const searchOk = searchTerm.length === 0 || item.searchText.includes(searchTerm);

      return categoryOk && searchOk;
    })
    .map((item) => item.service)
    .filter(isPublicVisibleService)
    .sort(sortServicesByPriority);
}

export async function getPopularServices(limit = 6): Promise<Service[]> {
  const allServices = await findAllServices();
  return allServices.filter((service) => service.popular && isPublicVisibleService(service)).sort(sortServicesByPriority).slice(0, limit);
}

export async function getHomepageServiceCategories(): Promise<ServiceCategorySummary[]> {
  const allServices = await findAllServices();
  return buildServiceCategorySummaries(allServices, true);
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const service = await findServiceBySlug(slug);
  return service && isPublicVisibleService(service) ? service : null;
}

export async function getServiceCategories(): Promise<string[]> {
  const publicServices = await getServices();
  const categories = getOrderedServiceCategories(publicServices, true);
  return categories.length > 0 ? categories : ["All"];
}

export async function getCategorySlugs(): Promise<Array<{ slug: string; name: string }>> {
  const categoryList = await getServiceCategories();
  return categoryList
    .filter((category) => category !== "All")
    .map((category) => ({ name: category, slug: slugifyCategory(category) }));
}

export async function getServiceSlugs(): Promise<string[]> {
  const allServices = await getServices();
  return allServices.map((service) => service.slug);
}

export async function revalidateServicesTag(): Promise<void> {
  revalidateTagCompat("services", { expire: 0 });
}

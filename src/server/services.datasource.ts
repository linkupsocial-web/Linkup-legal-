import "server-only";

import { unstable_cache as cache } from "next/cache";
import type { Service } from "@/types/service";
import {
  listSupabaseServicesForCatalog,
  ServiceCatalogUnavailableError,
} from "./repositories/services.supabase.repository";

export interface ServicesDataSource {
  getServices(): Promise<Service[]>;
  getCategories(): Promise<string[]>;
}

export const SERVICES_REVALIDATE_SECONDS = 60;

const loadServices = cache(
  async (): Promise<Service[]> => listSupabaseServicesForCatalog(),
  ["services-datasource"],
  { revalidate: SERVICES_REVALIDATE_SECONDS, tags: ["services"] }
);

class SupabaseServicesDataSource implements ServicesDataSource {
  async getServices(): Promise<Service[]> {
    return loadServices();
  }

  async getCategories(): Promise<string[]> {
    const serviceList = await this.getServices();
    const categories = Array.from(new Set(serviceList.map((service) => service.category)));

    return categories.length > 0 ? ["All", ...categories] : ["All"];
  }
}

export const servicesDataSource: ServicesDataSource = new SupabaseServicesDataSource();
export { ServiceCatalogUnavailableError };

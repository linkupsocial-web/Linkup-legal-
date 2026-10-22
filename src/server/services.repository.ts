import "server-only";
import { cache } from "react";
import type { Service } from "@/types/service";
import { servicesDataSource } from "./services.datasource";

export type ServiceIndexItem = {
  service: Service;
  slug: string;
  category: string;
  searchText: string;
};

type ServicesIndex = {
  all: Service[];
  index: ServiceIndexItem[];
  bySlug: Record<string, Service>;
};

const readServicesIndex = cache(async (): Promise<ServicesIndex> => {
  const all = await servicesDataSource.getServices();
  const bySlug = all.reduce<Record<string, Service>>((acc, service) => {
    acc[service.slug] = service;
    return acc;
  }, {});

  const index = all.map((service) => ({
    service,
    slug: service.slug,
    category: service.category,
    searchText: `${service.title} ${service.description} ${service.features.join(" ")}`.toLowerCase(),
  }));

  return { all, index, bySlug };
});

export async function findAllServices(): Promise<Service[]> {
  const index = await readServicesIndex();
  return index.all;
}

export async function findServiceBySlug(slug: string): Promise<Service | null> {
  const index = await readServicesIndex();
  return index.bySlug[slug] ?? null;
}

export async function findServiceIndex(): Promise<ServiceIndexItem[]> {
  const data = await readServicesIndex();
  return data.index;
}

export async function findAllCategories(): Promise<string[]> {
  return servicesDataSource.getCategories();
}

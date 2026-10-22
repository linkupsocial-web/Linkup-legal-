import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getCategorySlug, isPublicVisibleService, normalizeCategoryName, sortServicesByPriority } from "@/lib/service-categories";
import { normalizeServiceStatus } from "@/lib/service-status";
import { normalizeServiceImage, normalizeServiceStringArray } from "@/lib/service-content";
import type { Service } from "@/types/service";
import {
  CRM_SERVICE_HEADERS,
  getServiceStats,
  parseCrmServiceImportRecord,
  type CrmService,
  type ServiceMutationInput,
  type ServiceUpdatePatch,
  type StoredCrmService,
} from "./crm-service-csv";
import { mapSupabaseServiceRow, type SupabaseServiceRow } from "./service-row.mapper";

const revalidateTagCompat = revalidateTag as unknown as (tag: string, profile?: { expire: number }) => void;

type CrmListParams = {
  status?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { CRM_SERVICE_HEADERS, getServiceStats, parseCrmServiceImportRecord };
export type { CrmService, ServiceMutationInput, ServiceUpdatePatch, StoredCrmService };

export class ServiceCatalogUnavailableError extends Error {
  constructor() {
    super("The service catalog is temporarily unavailable.");
    this.name = "ServiceCatalogUnavailableError";
  }
}

function getSupabase() {
  if (!isSupabaseServerConfigured()) {
    throw new ServiceCatalogUnavailableError();
  }

  return createSupabaseServiceRoleClient();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toCrmService(row: SupabaseServiceRow): CrmService {
  return {
    ...mapSupabaseServiceRow(row),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function toMutation(
  data: ServiceMutationInput | ServiceUpdatePatch,
  fallback?: Partial<CrmService>,
  serviceId?: string
) {
  const title = data.title?.trim() || fallback?.title || "";
  const slug = data.slug?.trim() || fallback?.slug || (title ? slugify(title) : undefined);
  const category = data.category?.trim() || fallback?.category || "Government Services";
  const status = data.status !== undefined ? normalizeServiceStatus(data.status) : fallback?.status;
  const price = Math.max(0, Math.trunc(data.price ?? fallback?.price ?? 0));

  return {
    ...(serviceId ? { id: serviceId } : {}),
    ...(slug ? { slug } : {}),
    ...(title ? { title } : {}),
    description: data.description?.trim() ?? fallback?.description ?? (title ? `Get expert assistance for ${title.toLowerCase()}.` : undefined),
    category,
    category_slug: getCategorySlug(category),
    icon: data.icon?.trim() ?? fallback?.icon ?? "FileText",
    image: data.image !== undefined ? normalizeServiceImage(data.image) : fallback?.image ?? "",
    price,
    duration: data.duration?.trim() ?? fallback?.duration ?? "3-7 days",
    customers_served: Math.max(0, Math.trunc(data.customersServed ?? fallback?.customersServed ?? 0)),
    required_documents:
      data.requiredDocuments !== undefined
        ? normalizeServiceStringArray(data.requiredDocuments)
        : fallback?.requiredDocuments ?? [],
    features: data.features !== undefined ? normalizeServiceStringArray(data.features) : fallback?.features ?? [],
    popular: data.popular ?? fallback?.popular ?? false,
    status: status ?? "available",
    priority: data.priority ?? fallback?.priority ?? 9999,
  };
}

function applyCrmFilters(services: CrmService[], params: CrmListParams): CrmService[] {
  const status = params.status?.trim();
  const search = params.search?.trim().toLowerCase() ?? "";

  let filtered = services.slice().sort((left, right) => {
    const priorityDiff = (left.priority ?? 9999) - (right.priority ?? 9999);
    if (priorityDiff !== 0) return priorityDiff;

    const updatedDiff = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedDiff !== 0) return updatedDiff;

    return left.title.localeCompare(right.title);
  });

  if (status && status !== "all") {
    filtered = filtered.filter((service) => service.status === status);
  }

  if (search) {
    filtered = filtered.filter((service) =>
      [
        service.id,
        service.slug,
        service.title,
        service.description,
        service.category,
        service.icon,
        service.duration,
        String(service.price),
        String(service.customersServed),
        service.status ?? "",
      ].some((value) => value.toLowerCase().includes(search))
    );
  }

  return filtered;
}

function pageResult<T>(items: T[], page = 1, limit = 15) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = items.length;

  return {
    items: items.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    pages: Math.ceil(total / safeLimit),
  };
}

function revalidateServiceCatalog() {
  revalidateTagCompat("services", { expire: 0 });
  revalidateTagCompat("services-search", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
  revalidatePath("/services/category/[category]", "page");
}

export async function listSupabaseServicesForCatalog(): Promise<Service[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("priority", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("service_catalog_supabase_query_failed", {
      code: error.code ?? null,
      message: error.message,
    });
    throw new ServiceCatalogUnavailableError();
  }

  return ((data ?? []) as SupabaseServiceRow[]).map(mapSupabaseServiceRow);
}

export async function getCrmServices(): Promise<CrmService[]> {
  return getStoredCrmServices();
}

export async function getStoredCrmServices(): Promise<StoredCrmService[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as SupabaseServiceRow[]).map(toCrmService);
}

export async function getStoredServiceById(id: string): Promise<StoredCrmService | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toCrmService(data as SupabaseServiceRow) : null;
}

export async function listPublicServices(): Promise<Service[]> {
  const services = await listSupabaseServicesForCatalog();
  return services.filter(isPublicVisibleService).sort(sortServicesByPriority);
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const services = await listPublicServices();
  return services.find((service) => service.slug === slug) ?? null;
}

export async function listCategories(): Promise<string[]> {
  const services = await listPublicServices();
  const categories = Array.from(new Set(services.map((service) => normalizeCategoryName(service.category))));
  return categories.length > 0 ? ["All", ...categories] : ["All"];
}

export async function searchServices(query: string): Promise<Service[]> {
  const normalized = query.trim().toLowerCase();
  const services = await listPublicServices();
  if (!normalized) return services;

  return services.filter((service) =>
    [service.title, service.description, service.category, service.features.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export async function listCrmServicesPaginated(params: CrmListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 15);
  return pageResult(applyCrmFilters(await getCrmServices(), params), page, limit);
}

export async function addService(data: ServiceMutationInput): Promise<CrmService> {
  const supabase = getSupabase();
  const serviceId = data.id && UUID_PATTERN.test(data.id) ? data.id : undefined;
  const { data: created, error } = await supabase
    .from("services")
    .insert(toMutation(data, undefined, serviceId))
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidateServiceCatalog();
  return toCrmService(created as SupabaseServiceRow);
}

export async function updateService(
  id: string,
  patch: ServiceUpdatePatch,
  existingService?: StoredCrmService | null
): Promise<CrmService | null> {
  const existing = existingService ?? (await getStoredServiceById(id));
  if (!existing) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("services")
    .update(toMutation(patch, existing))
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidateServiceCatalog();
  return toCrmService(data as SupabaseServiceRow);
}

export async function deleteService(id: string, existingService?: StoredCrmService | null): Promise<boolean> {
  const existing = existingService ?? (await getStoredServiceById(id));
  if (!existing) return false;

  const supabase = getSupabase();
  const { error } = await supabase.from("services").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);

  revalidateServiceCatalog();
  return true;
}

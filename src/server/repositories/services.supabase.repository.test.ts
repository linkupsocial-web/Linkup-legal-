import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;
const originalConsoleError = console.error;

const serviceId = "11111111-1111-4111-8111-111111111111";
let supabaseEnabled = false;
let catalogRows: Array<Record<string, unknown>> = [];
let catalogError: { code?: string; message: string } | null = null;
let lastInsert: Record<string, unknown> | null = null;
let lastUpdate: Record<string, unknown> | null = null;
let updateId: string | null = null;
const revalidatedTags: string[] = [];
const revalidatedPaths: string[] = [];

function createServiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: serviceId,
    slug: "active-service",
    title: "Active Service",
    description: "Service description",
    category: "Tax Services",
    icon: "FileText",
    image: "",
    price: 1000,
    pricingType: "fixed",
    duration: "3-7 days",
    customersServed: 0,
    requiredDocuments: [],
    features: [],
    popular: false,
    status: "available",
    priority: 1,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function createSupabaseMock() {
  return {
    from: (table: string) => {
      assert.equal(table, "services");

      return {
        select: () => ({
          order: () => ({
            order: async () => ({ data: catalogRows, error: catalogError }),
          }),
          eq: (_column: string, id: string) => ({
            maybeSingle: async () => ({
              data: catalogRows.find((row) => row.id === id) ?? null,
              error: null,
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          lastInsert = payload;
          return {
            select: () => ({
              single: async () => ({ data: createServiceRow(payload), error: null }),
            }),
          };
        },
        update: (payload: Record<string, unknown>) => {
          lastUpdate = payload;
          return {
            eq: (_column: string, id: string) => {
              updateId = id;
              return {
                select: () => ({
                  single: async () => ({ data: createServiceRow(payload), error: null }),
                }),
              };
            },
          };
        },
        delete: () => ({
          eq: async (_column: string, id: string) => {
            updateId = id;
            return { error: null };
          },
        }),
      };
    },
  };
}

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  if (request === "next/cache") {
    return {
      revalidateTag: (tag: string) => revalidatedTags.push(tag),
      revalidatePath: (path: string) => revalidatedPaths.push(path),
    };
  }
  if (request === "@/lib/supabase/server") {
    return {
      createSupabaseServiceRoleClient: createSupabaseMock,
      isSupabaseServerConfigured: () => supabaseEnabled,
    };
  }
  if (request === "@/lib/service-categories") {
    return {
      getCategorySlug: (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      normalizeCategoryName: (category: string) => category,
      isPublicVisibleService: (service: { status: string }) => service.status !== "disabled",
      sortServicesByPriority: (left: { priority: number }, right: { priority: number }) => left.priority - right.priority,
    };
  }
  if (request === "@/lib/service-status") return { normalizeServiceStatus: (value: unknown) => value ?? "available" };
  if (request === "@/lib/service-pricing") return { normalizeServicePricingType: () => "fixed" };
  if (request === "@/lib/service-content") {
    return { normalizeServiceImage: (value: unknown) => value, normalizeServiceStringArray: (value: unknown) => value };
  }
  if (request === "./crm-service-csv") {
    return {
      CRM_SERVICE_HEADERS: [],
      getServiceStats: () => ({ total: 0 }),
      parseCrmServiceImportRecord: () => null,
    };
  }
  if (request === "./service-row.mapper") return { mapSupabaseServiceRow: (row: Record<string, unknown>) => row };

  return originalLoad(request, parent, isMain);
};

async function main() {
  try {
    const {
      ServiceCatalogUnavailableError,
      addService,
      deleteService,
      getStoredServiceById,
      listPublicServices,
      updateService,
    } = await import("./services.supabase.repository.js");

    await assert.rejects(listPublicServices(), ServiceCatalogUnavailableError);

    supabaseEnabled = true;
    catalogRows = [
      createServiceRow({ id: "active", slug: "active", status: "available", priority: 2 }),
      createServiceRow({ id: "disabled", slug: "disabled", status: "disabled", priority: 1 }),
    ];
    assert.deepEqual(
      (await listPublicServices()).map((service) => service.slug),
      ["active"]
    );

    catalogRows = [createServiceRow()];
    assert.equal((await getStoredServiceById(serviceId))?.id, serviceId);
    assert.equal(await getStoredServiceById("active-service"), null);

    const updated = await updateService(serviceId, {
      title: "Updated Service",
      image: "https://cdn.example.com/new.png",
      status: "disabled",
    });
    assert.equal(updated?.title, "Updated Service");
    assert.equal(updateId, serviceId);
    assert.equal(lastUpdate?.image, "https://cdn.example.com/new.png");
    assert.equal(lastUpdate?.status, "disabled");
    assert.equal("pricing_type" in (lastUpdate ?? {}), false);
    assert.equal("price_min" in (lastUpdate ?? {}), false);

    await addService({ id: "legacy-sheet-id", title: "Imported Service" });
    assert.equal("id" in (lastInsert ?? {}), false);

    await addService({ id: serviceId, title: "Uploaded Service", image: "https://cdn.example.com/uploaded.png" });
    assert.equal(lastInsert?.id, serviceId);
    assert.equal(lastInsert?.image, "https://cdn.example.com/uploaded.png");

    assert.equal(await deleteService(serviceId), true);
    assert.equal(updateId, serviceId);
    assert.ok(revalidatedTags.includes("services"));
    assert.ok(revalidatedTags.includes("services-search"));
    assert.ok(revalidatedPaths.includes("/services"));

    catalogError = { code: "42P01", message: "relation services does not exist" };
    console.error = () => undefined;
    await assert.rejects(listPublicServices(), ServiceCatalogUnavailableError);
  } finally {
    console.error = originalConsoleError;
    moduleLoader._load = originalLoad;
  }

  console.log("Supabase-only CRM service repository: OK");
}

void main().catch((error) => {
  console.error = originalConsoleError;
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

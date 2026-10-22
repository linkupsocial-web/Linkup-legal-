import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;
const originalConsoleError = console.error;
const originalNodeEnv = process.env.NODE_ENV;
const mutableEnvironment = process.env as Record<string, string | undefined>;

let supabaseEnabled = false;
let googleSheetsConfigured = false;
let googleSheetsReady = false;
let fallbackWriteError: Error | null = null;
let capturedInsert: Record<string, unknown> | null = null;
let supabaseInsertResponse: { data: unknown; error: unknown } = { data: null, error: null };
let supabaseLookupResponse: { data: unknown; error: unknown } = { data: null, error: null };

const fallbackRequests: Array<Record<string, unknown>> = [];

const fallbackStore = {
  getStats: () => ({ total: 0 }),
  isGoogleCrmSheetConfigured: () => googleSheetsConfigured,
  isGoogleCrmSheetPersistenceReady: () => googleSheetsReady,
  addRequest: async (input: Record<string, unknown>) => {
    if (fallbackWriteError) throw fallbackWriteError;

    const now = "2026-07-30T12:00:00.000Z";
    const request = {
      ...input,
      id: String(input.id),
      status: "new",
      createdAt: now,
      updatedAt: now,
      agentNote: "",
      assignedAgentUsername: "",
      assignedAgentDisplayName: "",
    };
    fallbackRequests.push(request);
    return request;
  },
  getRequestById: async (id: string) => fallbackRequests.find((request) => request.id === id) ?? null,
  getStoredRequestById: async () => null,
  getRequests: async () => fallbackRequests,
  updateRequest: async () => null,
};

function createSupabaseMock() {
  return {
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        capturedInsert = payload;
        return {
          select: () => ({
            single: async () => supabaseInsertResponse,
          }),
        };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => supabaseLookupResponse,
        }),
      }),
    }),
  };
}

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  if (request === "@/lib/supabase/server") {
    return { createSupabaseServiceRoleClient: createSupabaseMock };
  }
  if (request === "@/lib/request-number") {
    return { generateRequestNumber: () => "LL-20260730-123456" };
  }
  if (request === "@/lib/request-status") {
    return { normalizeRequestStatus: (value: unknown) => (value === "payment_pending" ? "payment_pending" : "new") };
  }
  if (request === "@/lib/payment-status") {
    return { normalizePaymentStatus: (value: unknown) => (value === "captured" ? "captured" : "pending") };
  }
  if (request === "@/lib/service-pricing") {
    return {
      normalizeServicePricingType: (value: unknown, price: number) => value === "quote_required" || price <= 0 ? "quote_required" : "fixed",
      isPayablePricing: (pricingType: string, amount: number) => pricingType === "fixed" && amount > 0,
    };
  }
  if (request === "@/server/checkout-token") {
    return {
      createCheckoutToken: () => ({ value: "x".repeat(43), hash: "a".repeat(64), expiresAt: "2026-07-30T12:30:00.000Z" }),
      matchesCheckoutToken: () => true,
    };
  }
  if (request === "@/lib/crm-store") return fallbackStore;
  if (request === "./storage-mode") {
    return { isSupabaseStorageEnabled: () => supabaseEnabled };
  }

  return originalLoad(request, parent, isMain);
};

const input = {
  eventId: "evt_storage_test",
  requestNumber: "LL-20260730-123456",
  serviceSlug: "gst-registration",
  serviceName: "GST Registration",
  category: "Tax Services",
  customerName: "Aarav Sharma",
  phone: "+919876543210",
  email: "aarav@example.com",
  notes: "Need GST registration help.",
  baseAmount: 1000,
  gstRate: 18,
  gstAmount: 180,
  totalAmount: 1180,
  source: "website",
};

function resetState() {
  supabaseEnabled = false;
  googleSheetsConfigured = false;
  googleSheetsReady = false;
  fallbackWriteError = null;
  capturedInsert = null;
  supabaseInsertResponse = { data: null, error: null };
  supabaseLookupResponse = { data: null, error: null };
  fallbackRequests.length = 0;
  const globals = globalThis as typeof globalThis & { _checkoutRequests?: unknown[] };
  globals._checkoutRequests = [];
}

function supabaseRow() {
  return {
    id: "d6c99234-5d43-4b78-a690-a1ae93e1bf83",
    request_number: input.requestNumber,
    service_id: null,
    service_slug: input.serviceSlug,
    service_name: input.serviceName,
    category: input.category,
    customer_name: input.customerName,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    base_amount: input.baseAmount,
    gst_rate: input.gstRate,
    gst_amount: input.gstAmount,
    total_amount: input.totalAmount,
    pricing_type: "fixed",
    currency: "INR",
    price_snapshot: {},
    checkout_token_hash: "a".repeat(64),
    checkout_token_expires_at: "2026-07-30T12:30:00.000Z",
    request_status: "payment_pending",
    payment_status: "pending",
    assigned_to: null,
    admin_notes: null,
    source: input.source,
    created_at: "2026-07-30T12:00:00.000Z",
    updated_at: "2026-07-30T12:00:00.000Z",
  };
}

async function main() {
  try {
    const {
      PublicRequestStorageError,
      createPublicRequest,
      getRequestByRequestNumber,
      isRequestStorageSchemaMismatch,
      persistPublicRequestFallback,
    } =
      await import("./requests.supabase.repository.js");

    mutableEnvironment.NODE_ENV = "development";
    resetState();
    const memoryRequest = await createPublicRequest(input);
    assert.equal(memoryRequest.storageProvider, "memory");
    assert.equal(memoryRequest.totalAmount, 1180);
    assert.equal(memoryRequest.paymentAvailable, false);

    const checkoutRequest = await getRequestByRequestNumber(input.requestNumber);
    assert.equal(checkoutRequest?.serviceSlug, input.serviceSlug);
    assert.equal(checkoutRequest?.totalAmount, input.totalAmount);

    resetState();
    supabaseEnabled = true;
    supabaseInsertResponse = { data: supabaseRow(), error: null };
    const supabaseRequest = await createPublicRequest(input);
    assert.equal(supabaseRequest.storageProvider, "supabase");
    assert.equal(supabaseRequest.paymentAvailable, true);
    assert.equal(typeof supabaseRequest.checkoutToken, "string");
    assert.equal(capturedInsert?.request_status, "payment_pending");
    assert.equal(capturedInsert?.payment_status, "pending");
    assert.equal(capturedInsert?.pricing_type, "fixed");
    assert.equal(capturedInsert?.currency, "INR");
    assert.equal(typeof capturedInsert?.checkout_token_hash, "string");

    resetState();
    supabaseEnabled = true;
    supabaseInsertResponse = {
      data: null,
      error: {
        code: "42P01",
        message: "relation public.requests does not exist",
        details: "The requests table is missing.",
        hint: "Apply the current requests schema.",
      },
    };
    const logs: unknown[][] = [];
    console.error = (...args: unknown[]) => logs.push(args);
    await assert.rejects(
      () => createPublicRequest(input),
      (error: unknown) => error instanceof PublicRequestStorageError && error.provider === "supabase" && error.fallbackProvider === "memory"
    );
    const fallbackAfterSupabaseFailure = await persistPublicRequestFallback(input, "memory");
    assert.equal(fallbackAfterSupabaseFailure.storageProvider, "memory");
    const storageLog = logs.find(([event]) => event === "lead_storage_failed");
    assert.deepEqual(storageLog, [
      "lead_storage_failed",
      {
        eventId: input.eventId,
        storageProvider: "supabase",
        fallbackProvider: "memory",
        requestNumber: input.requestNumber,
        serviceSlug: input.serviceSlug,
        errorName: "PublicRequestStorageError",
        errorCode: "42P01",
        environment: {
          supabaseConfigured: true,
          googleSheetsConfigured: false,
          googleSheetsReady: false,
          production: false,
        },
      },
    ]);

    resetState();
    supabaseEnabled = true;
    googleSheetsConfigured = true;
    googleSheetsReady = true;
    mutableEnvironment.NODE_ENV = "development";
    logs.length = 0;
    supabaseInsertResponse = {
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'service_id' column of 'requests' in the schema cache",
        details: null,
        hint: null,
      },
    };
    await assert.rejects(
      () => createPublicRequest(input),
      (error: unknown) =>
        error instanceof PublicRequestStorageError &&
        error.fallbackProvider === "google_sheets" &&
        isRequestStorageSchemaMismatch(error)
    );
    const schemaStorageLog = logs.find(([event]) => event === "lead_storage_failed");
    assert.deepEqual(schemaStorageLog, [
      "lead_storage_failed",
      {
        eventId: input.eventId,
        storageProvider: "supabase",
        fallbackProvider: "google_sheets",
        requestNumber: input.requestNumber,
        serviceSlug: input.serviceSlug,
        errorName: "PublicRequestStorageError",
        errorCode: "PGRST204",
        environment: {
          supabaseConfigured: true,
          googleSheetsConfigured: true,
          googleSheetsReady: true,
          production: false,
        },
        schemaMismatch: { code: "PGRST204", missingColumn: "service_id" },
      },
    ]);
    assert.equal(JSON.stringify(schemaStorageLog).includes(input.customerName), false);
    assert.equal(JSON.stringify(schemaStorageLog).includes(input.phone), false);
    assert.equal(JSON.stringify(schemaStorageLog).includes(input.email), false);
    assert.equal(JSON.stringify(schemaStorageLog).includes(input.notes), false);

    resetState();
    mutableEnvironment.NODE_ENV = "production";
    await assert.rejects(
      () => createPublicRequest(input),
      (error: unknown) => error instanceof PublicRequestStorageError && error.provider === "unavailable"
    );

    resetState();
    googleSheetsConfigured = true;
    googleSheetsReady = true;
    mutableEnvironment.NODE_ENV = "development";
    const googleSheetsRequest = await createPublicRequest(input);
    assert.equal(googleSheetsRequest.storageProvider, "google_sheets");
    assert.equal(googleSheetsRequest.paymentAvailable, false);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
    console.error = originalConsoleError;
    moduleLoader._load = originalLoad;
  }

  console.log("public request storage routing: OK");
}

void main().catch((error) => {
  console.error = originalConsoleError;
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

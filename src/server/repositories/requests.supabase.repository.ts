import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { generateRequestNumber } from "@/lib/request-number";
import * as fallbackRequests from "@/lib/crm-store";
import type { CrmRequest, StoredCrmRequest } from "@/lib/crm-store";
import { normalizeRequestStatus, type RequestStatus } from "@/lib/request-status";
import { normalizePaymentStatus, type PaymentStatus } from "@/lib/payment-status";
import { isPayablePricing, normalizeServicePricingType, type ServicePricingType } from "@/lib/service-pricing";
import { createCheckoutToken, matchesCheckoutToken } from "@/server/checkout-token";
import { isSupabaseStorageEnabled } from "./storage-mode";
import { getFallbackStorageProvider, type PublicRequestStorageProvider } from "./lead-storage-policy";

export type { CrmRequest, StoredCrmRequest } from "@/lib/crm-store";
export type { RequestStatus } from "@/lib/request-status";
export type { PublicRequestStorageProvider } from "./lead-storage-policy";
export const getStats = fallbackRequests.getStats;

export type RequestPaymentStatus = PaymentStatus;

export type PublicRequestInput = {
  eventId?: string;
  requestNumber: string;
  serviceId?: string;
  serviceSlug: string;
  serviceName: string;
  category: string;
  customerName: string;
  phone: string;
  email: string;
  notes: string;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  pricingType?: ServicePricingType;
  currency?: string;
  source?: string;
};

export type PaymentSummaryRequest = {
  id: string;
  requestNumber: string;
  serviceId: string | null;
  serviceSlug: string;
  serviceName: string;
  category: string;
  customerName: string;
  phone: string;
  email: string;
  notes: string;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  pricingType: ServicePricingType;
  currency: string;
  requestStatus: string;
  paymentStatus: RequestPaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreatedPublicRequest = PaymentSummaryRequest & {
  storageProvider: PublicRequestStorageProvider;
  paymentAvailable: boolean;
  checkoutToken: string | null;
  storageTiming?: {
    checkoutTokenMs: number;
    supabaseInsertMs: number;
  };
};

export class PublicRequestStorageError extends Error {
  provider: PublicRequestStorageProvider | "unavailable";
  fallbackProvider?: Exclude<PublicRequestStorageProvider, "supabase">;
  code?: string;
  details?: string;
  hint?: string;

  constructor(
    provider: PublicRequestStorageProvider | "unavailable",
    input: {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
      fallbackProvider?: Exclude<PublicRequestStorageProvider, "supabase">;
    }
  ) {
    super(input.message);
    this.name = "PublicRequestStorageError";
    this.provider = provider;
    this.code = input.code;
    this.details = input.details;
    this.hint = input.hint;
    this.fallbackProvider = input.fallbackProvider;
  }
}

type SupabaseRequestRow = {
  id: string;
  request_number: string;
  service_slug: string;
  service_id: string | null;
  service_name: string;
  category: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  base_amount: number | string | null;
  gst_rate: number | string | null;
  gst_amount: number | string | null;
  total_amount: number | string | null;
  pricing_type: string | null;
  currency: string | null;
  price_snapshot: unknown;
  checkout_token_hash: string | null;
  checkout_token_expires_at: string | null;
  request_status: string | null;
  payment_status: string | null;
  assigned_to: string | null;
  admin_notes: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CrmRequestInput = Parameters<typeof fallbackRequests.addRequest>[0];
type CrmRequestPatch = Parameters<typeof fallbackRequests.updateRequest>[1];
type CrmListParams = {
  status?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
  assignedTo?: string | null;
};

const fallbackGlobal = globalThis as typeof globalThis & {
  _checkoutRequests?: PaymentSummaryRequest[];
};

if (!fallbackGlobal._checkoutRequests) fallbackGlobal._checkoutRequests = [];

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRequestStatus(value: unknown): RequestStatus {
  return normalizeRequestStatus(value);
}

function toPaymentStatus(value: unknown): RequestPaymentStatus {
  return normalizePaymentStatus(value);
}

function toCrmRequest(row: SupabaseRequestRow): CrmRequest {
  const totalAmount = toNumber(row.total_amount, toNumber(row.base_amount));
  const timestamp = row.created_at ?? new Date().toISOString();

  return {
    id: row.request_number,
    name: row.customer_name,
    phone: row.phone,
    email: row.email ?? "",
    notes: row.notes ?? "",
    service: row.service_name,
    price: Math.max(0, Math.trunc(totalAmount)),
    status: toRequestStatus(row.request_status),
    createdAt: timestamp,
    updatedAt: row.updated_at ?? timestamp,
    agentNote: row.admin_notes ?? "",
    assignedAgentUsername: row.assigned_to ?? "",
    assignedAgentDisplayName: row.assigned_to ?? "",
  };
}

function toStoredCrmRequest(row: SupabaseRequestRow): StoredCrmRequest {
  return {
    ...toCrmRequest(row),
    sheetRowNumber: 0,
  };
}

function toPaymentSummary(row: SupabaseRequestRow): PaymentSummaryRequest {
  const timestamp = row.created_at ?? new Date().toISOString();

  return {
    id: row.id,
    requestNumber: row.request_number,
    serviceId: row.service_id,
    serviceSlug: row.service_slug,
    serviceName: row.service_name,
    category: row.category ?? "",
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email ?? "",
    notes: row.notes ?? "",
    baseAmount: toNumber(row.base_amount),
    gstRate: toNumber(row.gst_rate, 18),
    gstAmount: toNumber(row.gst_amount),
    totalAmount: toNumber(row.total_amount),
    pricingType: normalizeServicePricingType(row.pricing_type, toNumber(row.total_amount)),
    currency: row.currency?.trim().toUpperCase() || "INR",
    requestStatus: toRequestStatus(row.request_status),
    paymentStatus: toPaymentStatus(row.payment_status),
    createdAt: timestamp,
    updatedAt: row.updated_at ?? timestamp,
  };
}

function fallbackSummaryFromRequest(request: CrmRequest): PaymentSummaryRequest {
  return {
    id: request.id,
    requestNumber: request.id,
    serviceId: null,
    serviceSlug: "",
    serviceName: request.service,
    category: "",
    customerName: request.name,
    phone: request.phone,
    email: request.email,
    notes: request.notes,
    baseAmount: request.price,
    gstRate: 18,
    gstAmount: 0,
    totalAmount: request.price,
    pricingType: request.price > 0 ? "fixed" : "quote_required",
    currency: "INR",
    requestStatus: request.status,
    paymentStatus: "pending",
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function storeFallbackSummary(request: PaymentSummaryRequest): void {
  const store = fallbackGlobal._checkoutRequests ?? [];
  const existingIndex = store.findIndex((entry) => entry.requestNumber === request.requestNumber);

  if (existingIndex === -1) {
    store.push(request);
  } else {
    store[existingIndex] = request;
  }

  fallbackGlobal._checkoutRequests = store;
}

function getFallbackSummary(requestNumber: string): PaymentSummaryRequest | null {
  return fallbackGlobal._checkoutRequests?.find((entry) => entry.requestNumber === requestNumber) ?? null;
}

function applyFallbackFilters(requests: CrmRequest[], params: CrmListParams): CrmRequest[] {
  const status = params.status?.trim();
  const search = params.search?.trim().toLowerCase() ?? "";

  let filtered = requests.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (params.assignedTo) {
    filtered = filtered.filter((request) => request.assignedAgentUsername === params.assignedTo);
  }

  if (status && status !== "all") {
    filtered = filtered.filter((request) => request.status === status);
  }

  if (search) {
    filtered = filtered.filter((request) =>
      [
        request.name,
        request.phone,
        request.email,
        request.notes,
        request.service,
        request.id,
        request.assignedAgentDisplayName,
        request.assignedAgentUsername,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }

  return filtered;
}

function pageResult<T>(items: T[], page = 1, limit = 20) {
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

function stripStoredCrmRequest(request: StoredCrmRequest): CrmRequest {
  const result = { ...request } as Partial<StoredCrmRequest>;
  delete result.sheetRowNumber;
  return result as CrmRequest;
}

function createSearchExpression(search: string): string {
  const safe = search.replace(/[%(),]/g, " ").trim();
  return [
    `request_number.ilike.%${safe}%`,
    `customer_name.ilike.%${safe}%`,
    `phone.ilike.%${safe}%`,
    `email.ilike.%${safe}%`,
    `notes.ilike.%${safe}%`,
    `service_name.ilike.%${safe}%`,
    `assigned_to.ilike.%${safe}%`,
  ].join(",");
}

async function getSupabaseRequestRowByLookup(lookup: string): Promise<SupabaseRequestRow | null> {
  const supabase = createSupabaseServiceRoleClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lookup);
  const query = supabase.from("requests").select("*");
  const result = isUuid ? await query.eq("id", lookup).maybeSingle() : await query.eq("request_number", lookup).maybeSingle();

  if (result.error) throw new Error(result.error.message);

  return (result.data as SupabaseRequestRow | null) ?? null;
}

async function countSupabaseRequests(params: { status?: string; assignedTo?: string | null }) {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase.from("requests").select("*", { count: "exact", head: true });

  if (params.assignedTo) query = query.eq("assigned_to", params.assignedTo);
  if (params.status) query = query.eq("request_status", normalizeRequestStatus(params.status));

  const { count, error } = await query;
  if (error) throw new Error(error.message);

  return count ?? 0;
}

function readErrorString(error: unknown, key: "message" | "code" | "details" | "hint"): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toPublicRequestStorageError(
  provider: PublicRequestStorageProvider | "unavailable",
  error: unknown
): PublicRequestStorageError {
  if (error instanceof PublicRequestStorageError) return error;

  const message =
    error instanceof Error ? error.message : readErrorString(error, "message") ?? "Request storage operation failed.";

  return new PublicRequestStorageError(provider, {
    message,
    code: readErrorString(error, "code"),
    details: readErrorString(error, "details"),
    hint: readErrorString(error, "hint"),
  });
}

function isDuplicateRequestNumberStorageError(error: PublicRequestStorageError): boolean {
  const message = error.message.toLowerCase();
  return error.code === "23505" || message.includes("duplicate key") || message.includes("requests_request_number_key");
}

const REQUEST_SCHEMA_COLUMNS = new Set([
  "service_id",
  "pricing_type",
  "currency",
  "price_snapshot",
  "checkout_token_hash",
  "checkout_token_expires_at",
]);

function getMissingRequestSchemaColumn(error: PublicRequestStorageError): string | null {
  if (error.code !== "PGRST204" && error.code !== "42703") return null;

  const message = error.message;
  const pgrstMatch = message.match(/['\"]([a-z_]+)['\"]\s+column of\s+['\"]requests['\"]/i);
  const postgresMatch = message.match(/requests\.([a-z_]+)/i);
  const column = pgrstMatch?.[1] ?? postgresMatch?.[1];

  return column && REQUEST_SCHEMA_COLUMNS.has(column) ? column : null;
}

export function isRequestStorageSchemaMismatch(error: unknown): error is PublicRequestStorageError {
  return error instanceof PublicRequestStorageError && getMissingRequestSchemaColumn(error) !== null;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function resolveFallbackStorageProvider(): Exclude<PublicRequestStorageProvider, "supabase"> | null {
  return getFallbackStorageProvider({
    googleSheetsReady: fallbackRequests.isGoogleCrmSheetPersistenceReady(),
    isProduction: isProductionRuntime(),
  });
}

function logPublicRequestStorageFailure(
  input: PublicRequestInput,
  error: PublicRequestStorageError,
  fallbackProvider?: Exclude<PublicRequestStorageProvider, "supabase"> | null
) {
  const missingSchemaColumn = getMissingRequestSchemaColumn(error);
  console.error("lead_storage_failed", {
    eventId: input.eventId ?? null,
    storageProvider: error.provider,
    fallbackProvider: fallbackProvider ?? null,
    requestNumber: input.requestNumber,
    serviceSlug: input.serviceSlug,
    errorName: error.name,
    errorCode: error.provider === "supabase" ? error.code ?? "storage_error" : "storage_error",
    environment: {
      supabaseConfigured: isSupabaseStorageEnabled(),
      googleSheetsConfigured: fallbackRequests.isGoogleCrmSheetConfigured(),
      googleSheetsReady: fallbackRequests.isGoogleCrmSheetPersistenceReady(),
      production: isProductionRuntime(),
    },
    ...(process.env.NODE_ENV === "development" && missingSchemaColumn
      ? { schemaMismatch: { code: error.code, missingColumn: missingSchemaColumn } }
      : {}),
  });
}

function toCreatedFallbackRequest(
  input: PublicRequestInput,
  created: CrmRequest,
  storageProvider: Exclude<PublicRequestStorageProvider, "supabase">
): CreatedPublicRequest {
  const summary: PaymentSummaryRequest = {
    id: created.id,
    requestNumber: input.requestNumber,
    serviceId: input.serviceId ?? null,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    category: input.category,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    baseAmount: input.baseAmount,
    gstRate: input.gstRate,
    gstAmount: input.gstAmount,
    totalAmount: input.totalAmount,
    pricingType: normalizeServicePricingType(input.pricingType, input.totalAmount),
    currency: input.currency?.trim().toUpperCase() || "INR",
    requestStatus: created.status,
    paymentStatus: "pending",
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };

  storeFallbackSummary(summary);
  return { ...summary, storageProvider, paymentAvailable: false, checkoutToken: null };
}

async function createFallbackPublicRequest(
  input: PublicRequestInput,
  storageProvider: Exclude<PublicRequestStorageProvider, "supabase">
): Promise<CreatedPublicRequest> {
  try {
    const created = await fallbackRequests.addRequest({
      id: input.requestNumber,
      name: input.customerName,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      service: input.serviceName,
      price: input.totalAmount,
    });

    return toCreatedFallbackRequest(input, created, storageProvider);
  } catch (error) {
    const storageError = toPublicRequestStorageError(storageProvider, error);
    logPublicRequestStorageFailure(input, storageError);
    throw storageError;
  }
}

export async function persistPublicRequestFallback(
  input: PublicRequestInput,
  storageProvider: Exclude<PublicRequestStorageProvider, "supabase">
): Promise<CreatedPublicRequest> {
  return createFallbackPublicRequest(input, storageProvider);
}

async function createSupabasePublicRequest(
  input: PublicRequestInput,
  fallbackProvider: Exclude<PublicRequestStorageProvider, "supabase"> | null
): Promise<CreatedPublicRequest> {
  try {
    const pricingType = normalizeServicePricingType(input.pricingType, input.totalAmount);
    const isPayable = isPayablePricing(pricingType, input.totalAmount);
    const checkoutTokenStartedAt = Date.now();
    const checkoutToken = createCheckoutToken();
    const checkoutTokenMs = Date.now() - checkoutTokenStartedAt;
    const supabase = createSupabaseServiceRoleClient();
    const supabaseInsertStartedAt = Date.now();
    const { data, error } = await supabase
      .from("requests")
      .insert({
        request_number: input.requestNumber,
        service_id: input.serviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.serviceId)
          ? input.serviceId
          : null,
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
        pricing_type: pricingType,
        currency: input.currency?.trim().toUpperCase() || "INR",
        price_snapshot: {
          service_id: input.serviceId ?? null,
          service_slug: input.serviceSlug,
          service_name: input.serviceName,
          pricing_type: pricingType,
          base_amount: input.baseAmount,
          gst_rate: input.gstRate,
          gst_amount: input.gstAmount,
          total_amount: input.totalAmount,
          currency: input.currency?.trim().toUpperCase() || "INR",
          captured_at: new Date().toISOString(),
        },
        checkout_token_hash: checkoutToken.hash,
        checkout_token_expires_at: checkoutToken.expiresAt,
        request_status: isPayable ? "payment_pending" : "new",
        payment_status: "pending",
        source: input.source ?? "website",
      })
      .select("*")
      .single();
    const supabaseInsertMs = Date.now() - supabaseInsertStartedAt;

    if (error) throw error;

    return {
      ...toPaymentSummary(data as SupabaseRequestRow),
      storageProvider: "supabase",
      paymentAvailable: isPayable,
      checkoutToken: checkoutToken.value,
      storageTiming: { checkoutTokenMs, supabaseInsertMs },
    };
  } catch (error) {
    const storageError = toPublicRequestStorageError("supabase", error);
    logPublicRequestStorageFailure(input, storageError, fallbackProvider);
    throw storageError;
  }
}

export async function createPublicRequest(input: PublicRequestInput): Promise<CreatedPublicRequest> {
  const fallbackProvider = resolveFallbackStorageProvider();

  if (!isSupabaseStorageEnabled()) {
    if (fallbackProvider && !isProductionRuntime()) return createFallbackPublicRequest(input, fallbackProvider);

    const storageError = new PublicRequestStorageError("unavailable", {
      message: "No persistent request storage is configured.",
      fallbackProvider: fallbackProvider ?? undefined,
    });
    logPublicRequestStorageFailure(input, storageError);
    throw storageError;
  }

  try {
    return await createSupabasePublicRequest(input, fallbackProvider);
  } catch (error) {
    const storageError = toPublicRequestStorageError("supabase", error);
    if (isDuplicateRequestNumberStorageError(storageError) || !fallbackProvider) throw storageError;

    throw new PublicRequestStorageError("supabase", {
      message: storageError.message,
      code: storageError.code,
      details: storageError.details,
      hint: storageError.hint,
      fallbackProvider,
    });
  }
}

export async function getRequestByRequestNumber(requestNumber: string): Promise<PaymentSummaryRequest | null> {
  const fallbackSummary = getFallbackSummary(requestNumber);
  if (fallbackSummary) return fallbackSummary;

  if (!isSupabaseStorageEnabled()) {
    const request = await fallbackRequests.getRequestById(requestNumber);
    return request ? fallbackSummaryFromRequest(request) : null;
  }

  try {
    const row = await getSupabaseRequestRowByLookup(requestNumber);
    if (row) return toPaymentSummary(row);
  } catch (error) {
    if (!resolveFallbackStorageProvider()) throw error;
  }

  const fallbackProvider = resolveFallbackStorageProvider();
  if (!fallbackProvider) return null;

  const request = await fallbackRequests.getRequestById(requestNumber);
  return request ? fallbackSummaryFromRequest(request) : null;
}

export async function getCheckoutRequest(
  requestNumber: string,
  checkoutToken: string | null | undefined
): Promise<PaymentSummaryRequest | null> {
  if (!isSupabaseStorageEnabled() || !checkoutToken) return null;

  const row = await getSupabaseRequestRowByLookup(requestNumber);
  if (!row || !matchesCheckoutToken(checkoutToken, row.checkout_token_hash)) return null;

  const expiresAt = row.checkout_token_expires_at ? Date.parse(row.checkout_token_expires_at) : Number.NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  return toPaymentSummary(row);
}

export async function getRequests(): Promise<CrmRequest[]> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackRequests.getRequests();
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as SupabaseRequestRow[]).map(toCrmRequest);
}

export async function listCrmRequestsPaginated(params: CrmListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);

  if (!isSupabaseStorageEnabled()) {
    return pageResult(applyFallbackFilters(await fallbackRequests.getRequests(), params), page, limit);
  }

  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from("requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  if (params.status && params.status !== "all") query = query.eq("request_status", normalizeRequestStatus(params.status));

  const search = params.search?.trim().toLowerCase();
  if (search) {
    query = query.or(createSearchExpression(search));
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: ((data ?? []) as SupabaseRequestRow[]).map(toCrmRequest),
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getCrmRequestStats(params: { assignedTo?: string | null } = {}) {
  if (!isSupabaseStorageEnabled()) {
    const source = applyFallbackFilters(await fallbackRequests.getRequests(), { assignedTo: params.assignedTo });
    return fallbackRequests.getStats(source);
  }

  const [total, newRequests, paymentPending, inProgress, completed] = await Promise.all([
    countSupabaseRequests({ assignedTo: params.assignedTo }),
    countSupabaseRequests({ status: "new", assignedTo: params.assignedTo }),
    countSupabaseRequests({ status: "payment_pending", assignedTo: params.assignedTo }),
    countSupabaseRequests({ status: "in_progress", assignedTo: params.assignedTo }),
    countSupabaseRequests({ status: "completed", assignedTo: params.assignedTo }),
  ]);

  const now = Date.now();
  const trend: Record<string, { date: string; new: number; payment_pending: number; in_progress: number; completed: number }> = {};
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(now - index * 86400000);
    const key = date.toISOString().slice(0, 10);
    trend[key] = { date: key, new: 0, payment_pending: 0, in_progress: 0, completed: 0 };
  }

  const supabase = createSupabaseServiceRoleClient();
  const startDate = new Date(now - 6 * 86400000).toISOString();
  let trendQuery = supabase.from("requests").select("created_at,request_status").gte("created_at", startDate);
  if (params.assignedTo) trendQuery = trendQuery.eq("assigned_to", params.assignedTo);

  const { data: trendRows, error: trendError } = await trendQuery.limit(1000);
  if (trendError) throw new Error(trendError.message);

  for (const row of (trendRows ?? []) as Array<Pick<SupabaseRequestRow, "created_at" | "request_status">>) {
    const key = (row.created_at ?? "").slice(0, 10);
    const status = toRequestStatus(row.request_status);
    if (trend[key] && (status === "new" || status === "payment_pending" || status === "in_progress" || status === "completed")) {
      trend[key][status] += 1;
    }
  }

  let topQuery = supabase.from("requests").select("service_name").order("created_at", { ascending: false }).limit(500);
  if (params.assignedTo) topQuery = topQuery.eq("assigned_to", params.assignedTo);

  const { data: topRows, error: topError } = await topQuery;
  if (topError) throw new Error(topError.message);

  const serviceCount: Record<string, number> = {};
  for (const row of (topRows ?? []) as Array<Pick<SupabaseRequestRow, "service_name">>) {
    serviceCount[row.service_name] = (serviceCount[row.service_name] ?? 0) + 1;
  }

  const topServices = Object.entries(serviceCount)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { total, new: newRequests, paymentPending, inProgress, completed, trend: Object.values(trend), topServices };
}

export async function getRequestById(id: string): Promise<CrmRequest | null> {
  const stored = await getStoredRequestById(id);
  return stored ? stripStoredCrmRequest(stored) : null;
}

export async function getStoredRequestById(id: string): Promise<StoredCrmRequest | null> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackRequests.getStoredRequestById(id);
  }

  const row = await getSupabaseRequestRowByLookup(id);
  return row ? toStoredCrmRequest(row) : null;
}

export async function addRequest(data: CrmRequestInput): Promise<CrmRequest> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackRequests.addRequest(data);
  }

  const requestNumber = data.id?.trim() || generateRequestNumber();
  const supabase = createSupabaseServiceRoleClient();
  const { data: created, error } = await supabase
    .from("requests")
    .insert({
      request_number: requestNumber,
      service_slug: "",
      service_name: data.service,
      category: "",
      customer_name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      base_amount: data.price ?? 0,
      gst_rate: 18,
      gst_amount: 0,
      total_amount: data.price ?? 0,
      pricing_type: data.price && data.price > 0 ? "fixed" : "quote_required",
      currency: "INR",
      price_snapshot: {},
      request_status: data.price && data.price > 0 ? "payment_pending" : "new",
      payment_status: "pending",
      source: "crm",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return toCrmRequest(created as SupabaseRequestRow);
}

export async function updateRequest(
  id: string,
  patch: CrmRequestPatch,
  existingRequest?: StoredCrmRequest | null
): Promise<CrmRequest | null> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackRequests.updateRequest(id, patch, existingRequest);
  }

  const existing = existingRequest ?? (await getStoredRequestById(id));
  if (!existing) return null;

  const updates = {
    ...(patch.status !== undefined ? { request_status: patch.status } : {}),
    ...(patch.agentNote !== undefined ? { admin_notes: patch.agentNote } : {}),
    ...(patch.assignedAgentUsername !== undefined ? { assigned_to: patch.assignedAgentUsername } : {}),
  };

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requests")
    .update(updates)
    .eq("request_number", existing.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return toCrmRequest(data as SupabaseRequestRow);
}

export async function updateRequestPaymentStatus(
  requestNumber: string,
  paymentStatus: RequestPaymentStatus
): Promise<PaymentSummaryRequest | null> {
  if (!isSupabaseStorageEnabled()) {
    const summary = getFallbackSummary(requestNumber);
    if (!summary) return null;

    const updated = { ...summary, paymentStatus, updatedAt: new Date().toISOString() };
    storeFallbackSummary(updated);
    return updated;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requests")
    .update({
      payment_status: paymentStatus,
      request_status:
        paymentStatus === "captured"
          ? "payment_completed"
          : paymentStatus === "failed" || paymentStatus === "verification_failed"
            ? "failed"
            : "payment_pending",
    })
    .eq("request_number", requestNumber)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return toPaymentSummary(data as SupabaseRequestRow);
}

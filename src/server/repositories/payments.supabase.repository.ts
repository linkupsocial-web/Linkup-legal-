import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import * as fallbackPayments from "@/lib/crm-payments-store";
import type { CrmPayment, PaymentStatus, StoredCrmPayment } from "@/lib/crm-payments-store";
import { isSupabaseStorageEnabled } from "./storage-mode";
import {
  updateRequestPaymentStatus,
  type PaymentSummaryRequest,
  type RequestPaymentStatus,
} from "./requests.supabase.repository";
import { normalizePaymentStatus } from "@/lib/payment-status";

export type { CrmPayment, PaymentStatus, StoredCrmPayment } from "@/lib/crm-payments-store";
export const getPaymentStats = fallbackPayments.getPaymentStats;

export type RazorpayPaymentRecord = {
  id: string;
  requestId: string | null;
  requestNumber: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: RequestPaymentStatus;
  totalAmount: number;
  currency: string;
  attemptNumber: number;
};

export type RazorpayWebhookEvent = {
  id: string;
  processed: boolean;
};

type SupabasePaymentRow = {
  id: string;
  request_id: string | null;
  request_number: string;
  service_name: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  base_amount: number | string | null;
  gst_amount: number | string | null;
  total_amount: number | string | null;
  currency: string | null;
  provider: string | null;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_signature: string | null;
  status: string | null;
  attempt_number: number | null;
  idempotency_key: string | null;
  method: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseRequestPaymentSeed = {
  id: string;
  request_number: string;
  service_name: string;
  customer_name: string;
  phone: string;
  email: string | null;
  base_amount: number | string | null;
  gst_amount: number | string | null;
  total_amount: number | string | null;
};

type CrmPaymentInput = Parameters<typeof fallbackPayments.addPayment>[0];
type CrmPaymentPatch = Parameters<typeof fallbackPayments.updatePayment>[1];
type CrmListParams = {
  status?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
  assignedTo?: string | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPaymentStatus(value: unknown): PaymentStatus {
  return normalizePaymentStatus(value);
}

function toRequestPaymentStatus(value: unknown): RequestPaymentStatus {
  return normalizePaymentStatus(value);
}

function toCrmPayment(row: SupabasePaymentRow): CrmPayment {
  const amountTotal = Math.max(0, Math.trunc(toNumber(row.total_amount)));
  const status = toPaymentStatus(row.status);
  const amountPaid = status === "captured" ? amountTotal : 0;
  const createdAt = row.created_at ?? new Date().toISOString();

  return {
    id: row.id,
    requestId: row.request_number,
    customerName: row.customer_name ?? "",
    phone: row.phone ?? "",
    serviceName: row.service_name,
    assignedAgentUsername: "",
    assignedAgentDisplayName: "",
    amountTotal,
    amountPaid,
    balanceDue: Math.max(0, amountTotal - amountPaid),
    paymentMethod: row.method ?? row.provider ?? "",
    paymentStatus: status,
    notes: row.failure_reason ?? "",
    paymentDate: row.paid_at ?? "",
    nextDueDate: "",
    createdAt,
    updatedAt: row.updated_at ?? createdAt,
  };
}

function toStoredCrmPayment(row: SupabasePaymentRow): StoredCrmPayment {
  return {
    ...toCrmPayment(row),
    sheetRowNumber: 0,
  };
}

function toRazorpayPaymentRecord(row: SupabasePaymentRow): RazorpayPaymentRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    requestNumber: row.request_number,
    provider: row.provider?.trim().toLowerCase() || "manual",
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    status: toRequestPaymentStatus(row.status),
    totalAmount: Math.max(0, toNumber(row.total_amount)),
    currency: row.currency?.trim().toUpperCase() || "INR",
    attemptNumber: Math.max(1, Math.trunc(toNumber(row.attempt_number, 1))),
  };
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

function stripStoredCrmPayment(payment: StoredCrmPayment): CrmPayment {
  const result = { ...payment } as Partial<StoredCrmPayment>;
  delete result.sheetRowNumber;
  return result as CrmPayment;
}

function createSearchExpression(search: string): string {
  const safe = search.replace(/[%(),]/g, " ").trim();
  return [
    `request_number.ilike.%${safe}%`,
    `customer_name.ilike.%${safe}%`,
    `phone.ilike.%${safe}%`,
    `email.ilike.%${safe}%`,
    `service_name.ilike.%${safe}%`,
    `provider.ilike.%${safe}%`,
    `method.ilike.%${safe}%`,
    `status.ilike.%${safe}%`,
  ].join(",");
}

function applyFallbackFilters(payments: CrmPayment[], params: CrmListParams): CrmPayment[] {
  const status = params.status?.trim();
  const search = params.search?.trim().toLowerCase() ?? "";

  let filtered = payments.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (params.assignedTo) {
    filtered = filtered.filter((payment) => payment.assignedAgentUsername === params.assignedTo);
  }

  if (status && status !== "all") {
    filtered = filtered.filter((payment) => payment.paymentStatus === status);
  }

  if (search) {
    filtered = filtered.filter((payment) =>
      [
        payment.customerName,
        payment.phone,
        payment.serviceName,
        payment.requestId,
        payment.paymentMethod,
        payment.paymentStatus,
        payment.notes,
        payment.assignedAgentDisplayName,
        payment.assignedAgentUsername,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }

  return filtered;
}

async function getRequestPaymentSeed(requestLookup: string): Promise<SupabaseRequestPaymentSeed | null> {
  const supabase = createSupabaseServiceRoleClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestLookup);
  const query = supabase
    .from("requests")
    .select("id,request_number,service_name,customer_name,phone,email,base_amount,gst_amount,total_amount");
  const result = isUuid ? await query.eq("id", requestLookup).maybeSingle() : await query.eq("request_number", requestLookup).maybeSingle();

  if (result.error) throw new Error(result.error.message);

  return (result.data as SupabaseRequestPaymentSeed | null) ?? null;
}

async function countSupabasePayments(params: { status?: string; assignedTo?: string | null }) {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase.from("payments").select("*", { count: "exact", head: true });

  if (params.status) query = query.eq("status", params.status);
  if (params.assignedTo) {
    query = query.eq("request_number", "__no_agent_payment_filter_until_request_join__");
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);

  return count ?? 0;
}

export async function createPaymentRecord(data: {
  requestNumber: string;
  provider?: string;
  providerOrderId?: string;
  status?: PaymentStatus;
}): Promise<CrmPayment | null> {
  if (!isSupabaseStorageEnabled()) return null;

  const request = await getRequestPaymentSeed(data.requestNumber);
  if (!request) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      request_id: request.id,
      request_number: request.request_number,
      service_name: request.service_name,
      customer_name: request.customer_name,
      phone: request.phone,
      email: request.email,
      base_amount: request.base_amount ?? 0,
      gst_amount: request.gst_amount ?? 0,
      total_amount: request.total_amount ?? 0,
      provider: data.provider ?? "manual",
      provider_order_id: data.providerOrderId,
      status: data.status ?? "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return toCrmPayment(payment as SupabasePaymentRow);
}

export async function getPayments(): Promise<CrmPayment[]> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackPayments.getPayments();
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as SupabasePaymentRow[]).map(toCrmPayment);
}

export async function listCrmPaymentsPaginated(params: CrmListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 20);

  if (!isSupabaseStorageEnabled()) {
    return pageResult(applyFallbackFilters(await fallbackPayments.getPayments(), params), page, limit);
  }

  if (params.assignedTo) {
    return pageResult([], page, limit);
  }

  const supabase = createSupabaseServiceRoleClient();
  let query = supabase.from("payments").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const search = params.search?.trim().toLowerCase();
  if (search) query = query.or(createSearchExpression(search));

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: ((data ?? []) as SupabasePaymentRow[]).map(toCrmPayment),
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getCrmPaymentStats(params: { assignedTo?: string | null } = {}) {
  if (!isSupabaseStorageEnabled()) {
    const source = applyFallbackFilters(await fallbackPayments.getPayments(), { assignedTo: params.assignedTo });
    return fallbackPayments.getPaymentStats(source);
  }

  const [total, pending, authorized, captured, failed] = await Promise.all([
    countSupabasePayments({ assignedTo: params.assignedTo }),
    countSupabasePayments({ status: "pending", assignedTo: params.assignedTo }),
    countSupabasePayments({ status: "authorized", assignedTo: params.assignedTo }),
    countSupabasePayments({ status: "captured", assignedTo: params.assignedTo }),
    countSupabasePayments({ status: "failed", assignedTo: params.assignedTo }),
  ]);

  const source = (await listCrmPaymentsPaginated({ limit: 500, assignedTo: params.assignedTo })).items;
  return {
    ...fallbackPayments.getPaymentStats(source),
    total,
    pending,
    authorized,
    captured,
    failed,
  };
}

export async function getPaymentRequestIds(): Promise<Set<string>> {
  if (!isSupabaseStorageEnabled()) {
    const payments = await fallbackPayments.getPayments();
    return new Set(payments.map((payment) => payment.requestId));
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("payments").select("request_number").limit(1000);
  if (error) throw new Error(error.message);

  return new Set(((data ?? []) as Array<Pick<SupabasePaymentRow, "request_number">>).map((payment) => payment.request_number));
}

export async function getPaymentByRequestNumber(requestNumber: string): Promise<CrmPayment | null> {
  const stored = await getStoredPaymentByRequestId(requestNumber);
  return stored ? stripStoredCrmPayment(stored) : null;
}

export async function getStoredPaymentByRequestId(requestId: string): Promise<StoredCrmPayment | null> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackPayments.getStoredPaymentByRequestId(requestId);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("request_number", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toStoredCrmPayment(data as SupabasePaymentRow) : null;
}

export async function getPaymentById(id: string): Promise<CrmPayment | null> {
  const stored = await getStoredPaymentById(id);
  return stored ? stripStoredCrmPayment(stored) : null;
}

export async function getStoredPaymentById(id: string): Promise<StoredCrmPayment | null> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackPayments.getStoredPaymentById(id);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toStoredCrmPayment(data as SupabasePaymentRow) : null;
}

export async function addPayment(data: CrmPaymentInput): Promise<CrmPayment> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackPayments.addPayment(data);
  }

  const existing = await getStoredPaymentByRequestId(data.requestId);
  if (existing) return stripStoredCrmPayment(existing);

  const request = await getRequestPaymentSeed(data.requestId);
  if (!request) throw new Error("Request not found.");

  const supabase = createSupabaseServiceRoleClient();
  const status = data.paymentStatus ?? "pending";
  const amountTotal = data.amountTotal ?? toNumber(request.total_amount);
  const amountPaid = status === "captured" ? amountTotal : data.amountPaid ?? 0;

  const { data: created, error } = await supabase
    .from("payments")
    .insert({
      request_id: request.id,
      request_number: request.request_number,
      service_name: request.service_name,
      customer_name: request.customer_name,
      phone: request.phone,
      email: request.email,
      base_amount: request.base_amount ?? amountTotal,
      gst_amount: request.gst_amount ?? 0,
      total_amount: amountTotal,
      provider: data.paymentMethod || "manual",
      status,
      method: data.paymentMethod ?? "",
      paid_at: amountPaid > 0 || status !== "pending" ? data.paymentDate || new Date().toISOString() : null,
      failure_reason: data.notes ?? "",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await updateRequestPaymentStatus(request.request_number, status);
  return toCrmPayment(created as SupabasePaymentRow);
}

export async function updatePayment(
  id: string,
  patch: CrmPaymentPatch,
  existingPayment?: StoredCrmPayment | null
): Promise<CrmPayment | null> {
  if (!isSupabaseStorageEnabled()) {
    return fallbackPayments.updatePayment(id, patch, existingPayment);
  }

  const existing = existingPayment ?? (await getStoredPaymentById(id));
  if (!existing) return null;

  const status = patch.paymentStatus ?? existing.paymentStatus;
  const amountTotal = patch.amountTotal ?? existing.amountTotal;
  const amountPaid = patch.amountPaid ?? (status === "captured" ? amountTotal : existing.amountPaid);

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .update({
      ...(patch.amountTotal !== undefined ? { total_amount: amountTotal } : {}),
      ...(patch.paymentMethod !== undefined ? { method: patch.paymentMethod, provider: patch.paymentMethod || "manual" } : {}),
      ...(patch.paymentStatus !== undefined ? { status: patch.paymentStatus } : {}),
      ...(patch.notes !== undefined ? { failure_reason: patch.notes } : {}),
      ...(patch.paymentDate !== undefined ? { paid_at: patch.paymentDate || null } : {}),
      ...(status === "captured" && amountPaid > 0 ? { paid_at: patch.paymentDate || existing.paymentDate || new Date().toISOString() } : {}),
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await updateRequestPaymentStatus(existing.requestId, status);
  return toCrmPayment(data as SupabasePaymentRow);
}

export async function getPaymentRecordForRequest(requestNumber: string): Promise<RazorpayPaymentRecord | null> {
  if (!isSupabaseStorageEnabled()) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("request_number", requestNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toRazorpayPaymentRecord(data as SupabasePaymentRow) : null;
}

export type ClaimedRazorpayPaymentAttempt = RazorpayPaymentRecord & {
  created: boolean;
};

type RazorpayAttemptRpcRow = {
  payment_id: string;
  provider_order_id: string | null;
  amount: number | string;
  currency: string | null;
  payment_status: string | null;
  created: boolean;
};

function getFirstRpcRow<T>(data: unknown): T | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as T) : null;
}

export async function claimRazorpayPaymentAttempt(input: {
  requestNumber: string;
  idempotencyKey: string;
}): Promise<ClaimedRazorpayPaymentAttempt> {
  if (!isSupabaseStorageEnabled()) throw new Error("Payment storage is unavailable.");

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_razorpay_payment_attempt", {
    p_request_number: input.requestNumber,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error("Payment attempt could not be reserved.");

  const row = getFirstRpcRow<RazorpayAttemptRpcRow>(data);
  if (!row) throw new Error("Payment attempt could not be reserved.");

  return {
    id: row.payment_id,
    requestId: null,
    requestNumber: input.requestNumber,
    provider: "razorpay",
    providerOrderId: row.provider_order_id,
    providerPaymentId: null,
    status: normalizePaymentStatus(row.payment_status),
    totalAmount: Math.max(0, toNumber(row.amount)),
    currency: row.currency?.trim().toUpperCase() || "INR",
    attemptNumber: 1,
    created: Boolean(row.created),
  };
}

export async function attachRazorpayOrder(input: {
  paymentId: string;
  orderId: string;
}): Promise<RazorpayPaymentRecord> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("attach_razorpay_order", {
    p_payment_id: input.paymentId,
    p_provider_order_id: input.orderId,
  });
  if (error) throw new Error("Payment order could not be stored.");

  const row = getFirstRpcRow<{ payment_id: string; provider_order_id: string; amount: number | string; currency: string | null }>(data);
  if (!row) throw new Error("Payment order could not be stored.");

  return {
    id: row.payment_id,
    requestId: null,
    requestNumber: "",
    provider: "razorpay",
    providerOrderId: row.provider_order_id,
    providerPaymentId: null,
    status: "order_created",
    totalAmount: Math.max(0, toNumber(row.amount)),
    currency: row.currency?.trim().toUpperCase() || "INR",
    attemptNumber: 1,
  };
}

export async function failRazorpayPaymentAttempt(input: { paymentId: string; reason: string }): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.rpc("fail_razorpay_payment_attempt", {
    p_payment_id: input.paymentId,
    p_failure_reason: input.reason,
  });
  if (error) throw new Error("Payment attempt could not be released.");
}

export async function finalizeRazorpayPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  status: Extract<RequestPaymentStatus, "authorized" | "captured" | "failed" | "verification_failed" | "refunded" | "partially_refunded">;
  method?: string;
  failureReason?: string;
}): Promise<RazorpayPaymentRecord | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("finalize_razorpay_payment", {
    p_provider_order_id: input.orderId,
    p_provider_payment_id: input.paymentId,
    p_provider_signature: input.signature,
    p_status: input.status,
    p_method: input.method ?? null,
    p_failure_reason: input.failureReason ?? null,
  });
  if (error) throw new Error("Payment state could not be finalized.");

  const row = getFirstRpcRow<{ payment_id: string; request_number: string; payment_status: string }>(data);
  if (!row) return null;

  return {
    id: row.payment_id,
    requestId: null,
    requestNumber: row.request_number,
    provider: "razorpay",
    providerOrderId: input.orderId,
    providerPaymentId: input.paymentId,
    status: normalizePaymentStatus(row.payment_status),
    totalAmount: 0,
    currency: "INR",
    attemptNumber: 1,
  };
}

export async function recordRazorpayWebhookEvent(input: {
  providerEventId: string;
  eventType: string;
  requestNumber?: string;
  orderId?: string;
  paymentId?: string;
  payload: Record<string, unknown>;
  paymentStatus?: Extract<RequestPaymentStatus, "authorized" | "captured" | "failed" | "refunded" | "partially_refunded">;
  method?: string;
}): Promise<{ id: string; duplicate: boolean }> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("record_razorpay_webhook_event", {
    p_provider_event_id: input.providerEventId,
    p_event_type: input.eventType,
    p_request_number: input.requestNumber ?? null,
    p_provider_order_id: input.orderId ?? null,
    p_provider_payment_id: input.paymentId ?? null,
    p_payload: input.payload,
    p_payment_status: input.paymentStatus ?? null,
    p_method: input.method ?? null,
  });
  if (error) throw new Error("Webhook event could not be recorded.");

  const row = getFirstRpcRow<{ id: string; duplicate: boolean }>(data);
  if (!row) throw new Error("Webhook event could not be recorded.");
  return row;
}

export async function getRazorpayPaymentByOrderId(orderId: string): Promise<RazorpayPaymentRecord | null> {
  if (!isSupabaseStorageEnabled()) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", "razorpay")
    .eq("provider_order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toRazorpayPaymentRecord(data as SupabasePaymentRow) : null;
}

export async function saveRazorpayPendingPayment(input: {
  request: PaymentSummaryRequest;
  orderId: string;
  currency: string;
}): Promise<RazorpayPaymentRecord> {
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Online payment storage is unavailable outside Supabase mode.");
  }

  const existing = await getPaymentRecordForRequest(input.request.requestNumber);
  if (existing?.status === "captured") return existing;
  if (existing && existing.provider !== "razorpay") {
    throw new Error("This request already has a payment managed by the CRM.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    request_id: input.request.id,
    request_number: input.request.requestNumber,
    service_name: input.request.serviceName,
    customer_name: input.request.customerName,
    phone: input.request.phone,
    email: input.request.email,
    base_amount: input.request.baseAmount,
    gst_amount: input.request.gstAmount,
    total_amount: input.request.totalAmount,
    currency: input.currency,
    provider: "razorpay",
    provider_order_id: input.orderId,
    provider_payment_id: null,
    provider_signature: null,
    status: "pending",
    method: null,
    paid_at: null,
    failure_reason: null,
  };

  const result = existing
    ? await supabase.from("payments").update(payload).eq("id", existing.id).select("*").single()
    : await supabase.from("payments").insert(payload).select("*").single();

  if (result.error) throw new Error(result.error.message);

  return toRazorpayPaymentRecord(result.data as SupabasePaymentRow);
}

export async function markRazorpayPaymentPaid(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  method?: string;
}): Promise<RazorpayPaymentRecord | null> {
  const existing = await getRazorpayPaymentByOrderId(input.orderId);
  if (!existing) return null;
  if (existing.status === "captured" || existing.status === "refunded") return existing;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "captured",
      provider_payment_id: input.paymentId,
      provider_signature: input.signature,
      method: input.method?.trim() || "razorpay",
      paid_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await updateRequestPaymentStatus(existing.requestNumber, "captured");
  return toRazorpayPaymentRecord(data as SupabasePaymentRow);
}

export async function updateRazorpayPaymentStatus(input: {
  orderId: string;
  status: Extract<RequestPaymentStatus, "captured" | "failed" | "refunded">;
  paymentId?: string;
  method?: string;
}): Promise<RazorpayPaymentRecord | null> {
  const existing = await getRazorpayPaymentByOrderId(input.orderId);
  if (!existing) return null;

  const cannotDowngradePaid = existing.status === "captured" && input.status === "failed";
  const cannotReopenRefund = existing.status === "refunded" && input.status === "captured";
  if (cannotDowngradePaid || cannotReopenRefund) return existing;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: input.status,
      ...(input.paymentId ? { provider_payment_id: input.paymentId } : {}),
      ...(input.method ? { method: input.method } : {}),
      ...(input.status === "captured" ? { paid_at: new Date().toISOString(), failure_reason: null } : {}),
      ...(input.status === "failed" ? { failure_reason: "Razorpay reported that this payment failed." } : {}),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await updateRequestPaymentStatus(existing.requestNumber, input.status);
  return toRazorpayPaymentRecord(data as SupabasePaymentRow);
}

export async function getOrCreateRazorpayWebhookEvent(input: {
  eventType: string;
  requestNumber?: string;
  orderId?: string;
  paymentId?: string;
  payload: Record<string, unknown>;
}): Promise<RazorpayWebhookEvent> {
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Webhook event storage is unavailable outside Supabase mode.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const eventKey = input.orderId || input.paymentId
    ? `${input.eventType}:${input.orderId ?? "none"}:${input.paymentId ?? "none"}`
    : null;
  let lookup = supabase.from("payment_events").select("id,processed").eq("provider", "razorpay").eq("event_type", input.eventType);
  if (eventKey) {
    lookup = lookup.eq("event_key", eventKey);
  } else {
    lookup = input.orderId ? lookup.eq("provider_order_id", input.orderId) : lookup.is("provider_order_id", null);
    lookup = input.paymentId ? lookup.eq("provider_payment_id", input.paymentId) : lookup.is("provider_payment_id", null);
  }

  const { data: existing, error: lookupError } = await lookup.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return existing as RazorpayWebhookEvent;

  const { data, error } = await supabase
    .from("payment_events")
    .insert({
      provider: "razorpay",
      event_type: input.eventType,
      request_number: input.requestNumber ?? null,
      provider_order_id: input.orderId ?? null,
      provider_payment_id: input.paymentId ?? null,
      event_key: eventKey,
      payload: input.payload,
      processed: false,
    })
    .select("id,processed")
    .single();
  if (error) {
    if (eventKey && error.code === "23505") {
      const { data: duplicate, error: duplicateLookupError } = await supabase
        .from("payment_events")
        .select("id,processed")
        .eq("event_key", eventKey)
        .maybeSingle();
      if (duplicateLookupError) throw new Error(duplicateLookupError.message);
      if (duplicate) return duplicate as RazorpayWebhookEvent;
    }

    throw new Error(error.message);
  }

  return data as RazorpayWebhookEvent;
}

export async function markRazorpayWebhookEventProcessed(eventId: string): Promise<void> {
  if (!isSupabaseStorageEnabled()) return;

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("payment_events").update({ processed: true }).eq("id", eventId);
  if (error) throw new Error(error.message);
}

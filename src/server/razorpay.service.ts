import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type RazorpayServerConfig = {
  keyId: string;
  keySecret: string;
};

type RazorpayWebhookConfig = {
  webhookSecret: string;
};

const RAZORPAY_TIMEOUT_MS = 4_500;

export class RazorpayServiceError extends Error {
  code: "RAZORPAY_UNAVAILABLE" | "RAZORPAY_INVALID_RESPONSE" | "RAZORPAY_NOT_CONFIGURED";

  constructor(code: RazorpayServiceError["code"], message: string) {
    super(message);
    this.name = "RazorpayServiceError";
    this.code = code;
  }
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export type RazorpayPayment = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
};

function getRazorpayServerConfig(): RazorpayServerConfig | null {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();

  if (!keyId || !keySecret) return null;

  return { keyId, keySecret };
}

function getRazorpayWebhookConfig(): RazorpayWebhookConfig | null {
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
  return webhookSecret ? { webhookSecret } : null;
}

function getAuthorization(config: RazorpayServerConfig) {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`;
}

async function razorpayFetch(path: string, init: RequestInit): Promise<Response> {
  const config = getRazorpayServerConfig();
  if (!config) throw new RazorpayServiceError("RAZORPAY_NOT_CONFIGURED", "Razorpay is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAZORPAY_TIMEOUT_MS);
  try {
    return await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: { Authorization: getAuthorization(config), ...init.headers },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new RazorpayServiceError("RAZORPAY_UNAVAILABLE", "Razorpay is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

export function isRazorpayServerConfigured(): boolean {
  return getRazorpayServerConfig() !== null;
}

export function isRazorpayWebhookConfigured(): boolean {
  return getRazorpayWebhookConfig() !== null;
}

export function isRazorpayCheckoutConfigured(): boolean {
  const config = getRazorpayServerConfig();
  const publicKeyId = (process.env.RAZORPAY_KEY_ID ?? "").trim();

  return Boolean(config && publicKeyId && publicKeyId === config.keyId);
}

export function getRazorpayPublicKeyId(): string {
  return isRazorpayCheckoutConfigured() ? (process.env.RAZORPAY_KEY_ID ?? "").trim() : "";
}

export function toRazorpayAmountPaise(amount: number): number {
  return Math.max(0, Math.round(amount * 100));
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const config = getRazorpayServerConfig();
  if (!config) return false;

  const digest = createHmac("sha256", config.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(input.signature);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string): boolean {
  const config = getRazorpayWebhookConfig();
  if (!config) return false;

  const digest = createHmac("sha256", config.webhookSecret).update(payload).digest("hex");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const config = getRazorpayServerConfig();
  if (!config) {
    throw new RazorpayServiceError("RAZORPAY_NOT_CONFIGURED", "Razorpay is not configured.");
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new RazorpayServiceError("RAZORPAY_INVALID_RESPONSE", "A positive payment amount in paise is required.");
  }

  const response = await razorpayFetch("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });

  const payload = (await response.json().catch(() => null)) as Partial<RazorpayOrder> | null;
  if (!response.ok || !payload || typeof payload.id !== "string") {
    throw new RazorpayServiceError("RAZORPAY_UNAVAILABLE", "Razorpay order creation failed.");
  }

  const amount = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);
  const currency = typeof payload.currency === "string" ? payload.currency.toUpperCase() : "";
  if (!Number.isInteger(amount) || amount <= 0 || !currency) {
    throw new RazorpayServiceError("RAZORPAY_INVALID_RESPONSE", "Razorpay returned an invalid order response.");
  }

  return { id: payload.id, amount, currency };
}

export async function getRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const response = await razorpayFetch(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof payload?.id === "string" ? payload.id : "";
  const orderId = typeof payload?.order_id === "string" ? payload.order_id : "";
  const amount = typeof payload?.amount === "number" ? payload.amount : Number(payload?.amount);
  const currency = typeof payload?.currency === "string" ? payload.currency.toUpperCase() : "";
  const status = typeof payload?.status === "string" ? payload.status : "";
  const method = typeof payload?.method === "string" ? payload.method : undefined;

  if (!response.ok || !id || !orderId || !Number.isInteger(amount) || amount <= 0 || !currency || !status) {
    throw new RazorpayServiceError("RAZORPAY_INVALID_RESPONSE", "Razorpay returned an invalid payment response.");
  }

  return {
    id,
    orderId,
    amount,
    currency,
    status,
    ...(method ? { method } : {}),
  };
}

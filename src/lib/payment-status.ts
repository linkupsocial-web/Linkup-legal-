export const PAYMENT_STATUSES = [
  "pending",
  "order_created",
  "authorized",
  "captured",
  "failed",
  "verification_failed",
  "refunded",
  "partially_refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const legacyStatusMap: Record<string, PaymentStatus> = {
  partial: "authorized",
  paid: "captured",
};

export function normalizePaymentStatus(value: unknown, fallback: PaymentStatus = "pending"): PaymentStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((PAYMENT_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as PaymentStatus;
  }

  return legacyStatusMap[normalized] ?? fallback;
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentFinal(status: PaymentStatus): boolean {
  return status === "captured" || status === "refunded" || status === "partially_refunded";
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return {
    pending: "Pending",
    order_created: "Order Created",
    authorized: "Authorized",
    captured: "Captured",
    failed: "Failed",
    verification_failed: "Verification Failed",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  }[status];
}

export const REQUEST_STATUSES = [
  "new",
  "payment_pending",
  "payment_completed",
  "in_progress",
  "completed",
  "cancelled",
  "failed",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const legacyStatusMap: Record<string, RequestStatus> = {
  requested: "new",
  visited: "in_progress",
  pending: "in_progress",
  paid: "payment_completed",
};

export function normalizeRequestStatus(value: unknown, fallback: RequestStatus = "new"): RequestStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((REQUEST_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as RequestStatus;
  }

  return legacyStatusMap[normalized] ?? fallback;
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function getRequestStatusLabel(status: RequestStatus): string {
  return {
    new: "New",
    payment_pending: "Payment Pending",
    payment_completed: "Payment Completed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
  }[status];
}

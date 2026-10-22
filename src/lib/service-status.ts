export type ServiceStatus = "available" | "coming-soon" | "disabled";

export const SERVICE_STATUS_OPTIONS: ReadonlyArray<{ value: ServiceStatus; label: string }> = [
  { value: "available", label: "Active" },
  { value: "coming-soon", label: "Coming Soon" },
  { value: "disabled", label: "Disabled" },
];

const SERVICE_STATUS_LABELS = new Map<ServiceStatus, string>(
  SERVICE_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

export function parseServiceStatus(value: unknown): ServiceStatus | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized === "active" || normalized === "available") return "available";
  if (normalized === "coming-soon" || normalized === "comingsoon") return "coming-soon";
  if (normalized === "disabled") return "disabled";

  return null;
}

export function normalizeServiceStatus(value: unknown, fallback: ServiceStatus = "available"): ServiceStatus {
  return parseServiceStatus(value) ?? fallback;
}

export function getServiceStatusLabel(status: ServiceStatus | undefined): string {
  return SERVICE_STATUS_LABELS.get(status ?? "available") ?? SERVICE_STATUS_LABELS.get("available") ?? "Active";
}

export function isPublicServiceStatus(status: ServiceStatus | undefined): boolean {
  return status !== "coming-soon" && status !== "disabled";
}

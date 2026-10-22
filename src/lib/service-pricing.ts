export const SERVICE_PRICING_TYPES = [
  "fixed",
  "starting_from",
  "range",
  "quote_required",
  "not_applicable",
] as const;

export type ServicePricingType = (typeof SERVICE_PRICING_TYPES)[number];

export function isServicePricingType(value: unknown): value is ServicePricingType {
  return typeof value === "string" && (SERVICE_PRICING_TYPES as readonly string[]).includes(value);
}

export function normalizeServicePricingType(value: unknown, price = 0): ServicePricingType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((SERVICE_PRICING_TYPES as readonly string[]).includes(normalized)) {
    return normalized as ServicePricingType;
  }

  return price > 0 ? "fixed" : "quote_required";
}

export function isPayablePricing(pricingType: ServicePricingType, totalAmount: number): boolean {
  return pricingType === "fixed" && Number.isFinite(totalAmount) && totalAmount > 0;
}

export function getPricingUnavailableCode(pricingType: ServicePricingType): "QUOTE_REQUIRED" | "PAYMENT_NOT_AVAILABLE" {
  return pricingType === "quote_required" || pricingType === "range" || pricingType === "starting_from"
    ? "QUOTE_REQUIRED"
    : "PAYMENT_NOT_AVAILABLE";
}

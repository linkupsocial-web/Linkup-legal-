const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;
const STORAGE_KEY = "linkup-legal:ad-landing-attribution";
const MAX_ATTRIBUTE_VALUE_LENGTH = 256;

export type LandingAttribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;

function cleanValue(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_ATTRIBUTE_VALUE_LENGTH) : undefined;
}

function readStoredAttribution(): LandingAttribution {
  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
    if (!rawValue) return {};

    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return ATTRIBUTION_KEYS.reduce<LandingAttribution>((result, key) => {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string") {
        const clean = cleanValue(value);
        if (clean) result[key] = clean;
      }
      return result;
    }, {});
  } catch {
    return {};
  }
}

export function captureLandingAttribution(search: string): LandingAttribution {
  if (typeof window === "undefined") return {};

  const query = new URLSearchParams(search);
  const current = ATTRIBUTION_KEYS.reduce<LandingAttribution>((result, key) => {
    const value = cleanValue(query.get(key));
    if (value) result[key] = value;
    return result;
  }, {});
  const attribution = { ...readStoredAttribution(), ...current };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers. The
    // current URL parameters remain available for this submission.
  }

  return attribution;
}

export function formatAttributionForRequest(attribution: LandingAttribution): string | null {
  const values = ATTRIBUTION_KEYS.flatMap((key) => (attribution[key] ? [`${key}=${attribution[key]}`] : []));
  return values.length > 0 ? values.join("; ") : null;
}

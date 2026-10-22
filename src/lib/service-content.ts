const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

function cleanStringArray(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;

    const item = value.trim();
    if (!item || HTML_TAG_PATTERN.test(item)) continue;

    const key = item.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

function parseJsonArray(value: unknown): unknown[] | null {
  let candidate = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (Array.isArray(candidate)) return candidate;
    if (typeof candidate !== "string") return null;

    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return Array.isArray(candidate) ? candidate : null;
}

function looksLikeJsonArray(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("[") || trimmed.startsWith('"[');
}

export function normalizeJsonStringArray(value: unknown): string[] {
  const parsed = parseJsonArray(value);
  return parsed ? cleanStringArray(parsed) : [];
}

export function normalizeServiceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? cleanStringArray(value) : [];
}

export function normalizeDelimitedServiceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return cleanStringArray(value);
  if (typeof value !== "string") return [];

  if (looksLikeJsonArray(value)) {
    return normalizeJsonStringArray(value);
  }

  return cleanStringArray(value.split(/\r?\n|[|,]/));
}

export function containsUnsafeServiceText(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item !== "string" || HTML_TAG_PATTERN.test(item));
}

export type ServiceContentInput = {
  image?: unknown;
  features?: unknown;
  requiredDocuments?: unknown;
};

type ValidatedServiceContent = {
  image?: string;
  features?: string[];
  requiredDocuments?: string[];
};

export type ServiceContentValidationResult =
  | {
      ok: true;
      value: ValidatedServiceContent;
    }
  | { ok: false; error: string };

export function normalizeServiceImage(value: unknown): string {
  if (typeof value !== "string") return "";

  const image = value.trim();
  if (!image) return "";

  if (image.startsWith("/") && !image.startsWith("//") && !image.includes("\\") && !image.includes("\u0000")) {
    const pathSegments = image.split("/");
    return pathSegments.includes("..") ? "" : image;
  }

  try {
    const url = new URL(image);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function validateServiceContentInput(input: ServiceContentInput): ServiceContentValidationResult {
  const value: ValidatedServiceContent = {};

  if (input.image !== undefined) {
    const image = normalizeServiceImage(input.image);
    if (typeof input.image !== "string" || (input.image.trim() && !image)) {
      return { ok: false, error: "Image must be a safe local path or an HTTP/HTTPS URL." };
    }
    value.image = image;
  }

  for (const [key, content] of [
    ["features", input.features],
    ["requiredDocuments", input.requiredDocuments],
  ] as const) {
    if (content === undefined) continue;
    if (!Array.isArray(content) || containsUnsafeServiceText(content)) {
      return { ok: false, error: `${key} must be an array of plain-text items.` };
    }

    value[key] = normalizeServiceStringArray(content);
  }

  return { ok: true, value };
}

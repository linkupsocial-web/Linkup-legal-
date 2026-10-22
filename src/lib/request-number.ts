const REQUEST_NUMBER_PREFIX = "LL";
export const REQUEST_NUMBER_PATTERN = /^LL-\d{8}-\d{6}$/;

function formatDateSegment(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function randomSixDigitSegment(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return String(values[0] % 1_000_000).padStart(6, "0");
  }

  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export function generateRequestNumber(date: Date = new Date()): string {
  return `${REQUEST_NUMBER_PREFIX}-${formatDateSegment(date)}-${randomSixDigitSegment()}`;
}

export function isRequestNumber(value: unknown): value is string {
  return typeof value === "string" && REQUEST_NUMBER_PATTERN.test(value.trim());
}

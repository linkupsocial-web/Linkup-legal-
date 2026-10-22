const checkoutRequestNumberPattern = /^\/checkout\/LL-\d{8}-\d{6}$/;
const checkoutTokenPattern = /^[A-Za-z0-9_-]{43,128}$/;

export function isSafeInternalCheckoutUrl(value: unknown, origin: string): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const url = new URL(value, origin);
    return (
      url.origin === origin &&
      checkoutRequestNumberPattern.test(url.pathname) &&
      checkoutTokenPattern.test(url.searchParams.get("token") ?? "")
    );
  } catch {
    return false;
  }
}

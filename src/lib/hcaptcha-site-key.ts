export function resolveHcaptchaSiteKey(publicSiteKey?: string, configuredSiteKey?: string): string {
  return publicSiteKey?.trim() || configuredSiteKey?.trim() || "";
}

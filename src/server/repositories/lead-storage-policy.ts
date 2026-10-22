export type PublicRequestStorageProvider = "supabase" | "google_sheets" | "memory";

export function getFallbackStorageProvider(input: {
  googleSheetsReady: boolean;
  isProduction: boolean;
}): Exclude<PublicRequestStorageProvider, "supabase"> | null {
  if (input.googleSheetsReady) return "google_sheets";
  if (!input.isProduction) return "memory";

  return null;
}

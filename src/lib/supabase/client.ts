import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedBrowserClient: SupabaseClient | null = null;

function getBrowserConfig() {
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !anonKey) return null;

  return { url, anonKey };
}

export function isSupabaseBrowserConfigured(): boolean {
  return getBrowserConfig() !== null;
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const config = getBrowserConfig();
  if (!config) {
    throw new Error("Supabase browser credentials are not configured.");
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(config.url, config.anonKey);
  }

  return cachedBrowserClient;
}

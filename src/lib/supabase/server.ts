import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

let cachedServiceRoleClient: SupabaseClient | null = null;

function readSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

export function getSupabaseServerConfig(): SupabaseServerConfig | null {
  return readSupabaseServerConfig();
}

export function isSupabaseServerConfigured(): boolean {
  return readSupabaseServerConfig() !== null;
}

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const config = readSupabaseServerConfig();
  if (!config) {
    throw new Error("Supabase server credentials are not configured.");
  }

  if (!cachedServiceRoleClient) {
    cachedServiceRoleClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "linkup-legal-server",
        },
      },
    });
  }

  return cachedServiceRoleClient;
}

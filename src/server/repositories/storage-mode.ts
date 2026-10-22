import "server-only";

import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export type StorageMode = "supabase" | "fallback";

export function isSupabaseStorageEnabled(): boolean {
  return isSupabaseServerConfigured();
}

export function getStorageMode(): StorageMode {
  return isSupabaseStorageEnabled() ? "supabase" : "fallback";
}

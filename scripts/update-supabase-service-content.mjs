import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SERVICE_CONTENT } from "./service-content.mjs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function equalStringArrays(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateContent() {
  const seen = new Set();

  for (const item of SERVICE_CONTENT) {
    if (!item.slug || seen.has(item.slug)) {
      throw new Error(`Invalid or duplicate service content slug: ${item.slug || "<empty>"}`);
    }
    seen.add(item.slug);

    for (const field of ["features", "requiredDocuments"]) {
      const values = item[field];
      if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value.trim() || /<\/?[a-z][^>]*>/i.test(value))) {
        throw new Error(`Invalid ${field} content for ${item.slug}`);
      }
    }

    if (!item.image.startsWith("/services/placeholders/")) {
      throw new Error(`Invalid placeholder image path for ${item.slug}`);
    }
  }
}

async function main() {
  validateContent();

  const url = (process.env.SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "linkup-legal-service-content-sync" } },
  });

  const { data, error } = await supabase
    .from("services")
    .select("id,slug,image,features,required_documents")
    .order("slug", { ascending: true });

  if (error) throw new Error(`Could not read services: ${error.message}`);

  const existingBySlug = new Map((data ?? []).map((row) => [row.slug, row]));
  const updatedRows = [];
  const skippedRows = [];
  const missingSlugs = [];
  const failedRows = [];

  for (const item of SERVICE_CONTENT) {
    const existing = existingBySlug.get(item.slug);
    if (!existing) {
      missingSlugs.push(item.slug);
      continue;
    }

    const unchanged =
      existing.image === item.image &&
      equalStringArrays(existing.features, item.features) &&
      equalStringArrays(existing.required_documents, item.requiredDocuments);

    if (unchanged) {
      skippedRows.push(item.slug);
      continue;
    }

    const { error: updateError } = await supabase
      .from("services")
      .update({
        image: item.image,
        features: item.features,
        required_documents: item.requiredDocuments,
      })
      .eq("id", existing.id);

    if (updateError) {
      failedRows.push({ slug: item.slug, error: updateError.message });
      continue;
    }

    updatedRows.push(item.slug);
  }

  const unmatchedExistingSlugs = (data ?? [])
    .map((row) => row.slug)
    .filter((slug) => !SERVICE_CONTENT.some((item) => item.slug === slug));

  console.log(`Service content sync: updated=${updatedRows.length}, skipped=${skippedRows.length}, missing=${missingSlugs.length}, failed=${failedRows.length}`);
  console.log(`Updated rows: ${updatedRows.length ? updatedRows.join(", ") : "none"}`);
  console.log(`Skipped rows: ${skippedRows.length ? skippedRows.join(", ") : "none"}`);
  console.log(`Missing slugs: ${missingSlugs.length ? missingSlugs.join(", ") : "none"}`);
  console.log(`Unmatched existing slugs: ${unmatchedExistingSlugs.length ? unmatchedExistingSlugs.join(", ") : "none"}`);

  if (failedRows.length) {
    for (const failed of failedRows) {
      console.error(`Failed row ${failed.slug}: ${failed.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Service content sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});

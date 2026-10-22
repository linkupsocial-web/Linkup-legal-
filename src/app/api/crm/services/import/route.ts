import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import {
  addService,
  getStoredCrmServices,
  parseCrmServiceImportRecord,
  updateService,
} from "@/server/repositories/services.supabase.repository";
import { getCrmSession } from "@/lib/crm-session";

export const dynamic = "force-dynamic";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

function normalizeParseError(message: string) {
  return message.replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "CSV file is empty." }, { status: 400 });
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      {
        error: normalizeParseError(parsed.errors[0]?.message ?? "Failed to parse CSV."),
      },
      { status: 400 }
    );
  }

  const existingServices = await getStoredCrmServices();
  const existingById = new Map(existingServices.map((service) => [service.id.trim().toLowerCase(), service]));
  const existingBySlug = new Map(existingServices.map((service) => [service.slug.trim().toLowerCase(), service]));

  const summary: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const record of parsed.data) {
    const serviceInput = parseCrmServiceImportRecord(record);
    if (!serviceInput) {
      summary.skipped += 1;
      continue;
    }

    const idKey = serviceInput.id?.trim().toLowerCase() ?? "";
    const slugKey = serviceInput.slug?.trim().toLowerCase() ?? "";
    const existing = existingById.get(idKey) ?? existingBySlug.get(slugKey) ?? null;

    const saved = existing
      ? await updateService(existing.id, serviceInput, existing)
      : await addService(serviceInput);

    if (!saved) {
      summary.skipped += 1;
      continue;
    }

    const storedForMap = existing ?? saved;

    existingById.set(saved.id.trim().toLowerCase(), storedForMap);
    existingBySlug.set(saved.slug.trim().toLowerCase(), storedForMap);

    if (existing) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  return NextResponse.json({
    success: true,
    ...summary,
  });
}

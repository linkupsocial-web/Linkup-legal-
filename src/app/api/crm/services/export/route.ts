import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { CRM_SERVICE_HEADERS, getCrmServices } from "@/server/repositories/services.supabase.repository";
import { getCrmSession } from "@/lib/crm-session";

export const dynamic = "force-dynamic";

function getServicePriority(priority: number | undefined) {
  return typeof priority === "number" && Number.isFinite(priority) ? priority : Number.MAX_SAFE_INTEGER;
}

function sortCrmServices(
  left: { priority?: number; updatedAt: string; title: string },
  right: { priority?: number; updatedAt: string; title: string }
) {
  const priorityDiff = getServicePriority(left.priority) - getServicePriority(right.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const updatedDiff = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return left.title.localeCompare(right.title);
}

function serviceToCsvRow(service: Awaited<ReturnType<typeof getCrmServices>>[number]) {
  return {
    ID: service.id,
    Slug: service.slug,
    Title: service.title,
    Description: service.description,
    Category: service.category,
    Icon: service.icon,
    Image: service.image,
    Price: service.price,
    Duration: service.duration,
    "Customers Served": service.customersServed,
    "Required Documents": service.requiredDocuments.join("\n"),
    Features: service.features.join("\n"),
    Popular: service.popular ? "TRUE" : "FALSE",
    Status: service.status ?? "available",
    Priority: service.priority ?? 9999,
    "Created At": service.createdAt,
    "Updated At": service.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const services = (await getCrmServices()).slice().sort(sortCrmServices);
  const csv = Papa.unparse(
    services.map((service) => serviceToCsvRow(service)),
    {
      columns: CRM_SERVICE_HEADERS,
      header: true,
      newline: "\r\n",
    }
  );

  const fileName = `crm-services-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(`\ufeff${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { addRequest, getCrmRequestStats, listCrmRequestsPaginated } from "@/server/repositories/requests.supabase.repository";
import { getAvailableAgents } from "@/lib/crm-auth";
import { getCrmSession } from "@/lib/crm-session";
import { toRequestView } from "@/lib/crm-access";
import { getPaymentRequestIds } from "@/server/repositories/payments.supabase.repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const statsOnly = searchParams.get("stats") === "1";
  const assignedTo = session.role === "admin" ? undefined : session.username;

  if (statsOnly) {
    return NextResponse.json(await getCrmRequestStats({ assignedTo }));
  }

  const result = await listCrmRequestsPaginated({ status, search, page, limit, assignedTo });
  const paymentRequestIds = await getPaymentRequestIds();
  const agents = getAvailableAgents();
  const items = result.items.map((request) => toRequestView(request, session, agents, paymentRequestIds.has(request.id)));

  return NextResponse.json({ ...result, items });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    service?: string;
    price?: number;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const service = body.service?.trim();

  if (!name || !phone || !service) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const created = await addRequest({
      name,
      phone,
      email: body.email?.trim() ?? "",
      notes: body.notes?.trim() ?? "",
      service,
      ...(body.price !== undefined ? { price: Math.max(0, Math.trunc(body.price)) } : {}),
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Request storage is temporarily unavailable." }, { status: 502 });
  }
}

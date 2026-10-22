import { NextRequest, NextResponse } from "next/server";
import {
  addPayment,
  getCrmPaymentStats,
  getStoredPaymentByRequestId,
  listCrmPaymentsPaginated,
  type PaymentStatus,
} from "@/server/repositories/payments.supabase.repository";
import { getAvailableAgents } from "@/lib/crm-auth";
import { getCrmSession } from "@/lib/crm-session";
import { getStoredRequestById, updateRequest } from "@/server/repositories/requests.supabase.repository";

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
    return NextResponse.json(await getCrmPaymentStats({ assignedTo }));
  }

  return NextResponse.json(await listCrmPaymentsPaginated({ status, search, page, limit, assignedTo }));
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    requestId?: string;
    notes?: string;
    amountTotal?: number;
    amountPaid?: number;
    balanceDue?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentDate?: string;
    nextDueDate?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const request = await getStoredRequestById(requestId);
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const existingPayment = await getStoredPaymentByRequestId(requestId);
  if (existingPayment) {
    return NextResponse.json({ success: true, id: existingPayment.id, duplicate: true }, { status: 200 });
  }

  const agents = getAvailableAgents();
  const assignedAgent = agents.find((agent) => agent.username === request.assignedAgentUsername);

  try {
    const paymentStatus =
      body.paymentStatus && ["pending", "order_created", "authorized", "captured", "failed", "verification_failed", "refunded", "partially_refunded"].includes(body.paymentStatus.trim().toLowerCase())
        ? (body.paymentStatus.trim().toLowerCase() as PaymentStatus)
        : undefined;

    const created = await addPayment({
      requestId: request.id,
      customerName: request.name,
      phone: request.phone,
      serviceName: request.service,
      assignedAgentUsername: request.assignedAgentUsername,
      assignedAgentDisplayName: request.assignedAgentDisplayName || assignedAgent?.displayName || "",
      notes: body.notes?.trim() ?? "",
      amountTotal: body.amountTotal ?? request.price ?? 0,
      ...(body.amountPaid !== undefined ? { amountPaid: body.amountPaid } : {}),
      ...(body.balanceDue !== undefined ? { balanceDue: body.balanceDue } : {}),
      ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod.trim() } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(body.paymentDate !== undefined ? { paymentDate: body.paymentDate } : {}),
      ...(body.nextDueDate !== undefined ? { nextDueDate: body.nextDueDate } : {}),
    });

    if (request.status !== "payment_pending") {
      await updateRequest(request.id, { status: "payment_pending" }, request);
    }

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payment storage is temporarily unavailable." }, { status: 502 });
  }
}

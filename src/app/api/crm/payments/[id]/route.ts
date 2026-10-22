import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/crm-session";
import {
  getStoredPaymentById,
  updatePayment,
  type PaymentStatus,
} from "@/server/repositories/payments.supabase.repository";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as {
    amountTotal?: number;
    amountPaid?: number;
    balanceDue?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
    paymentDate?: string;
    nextDueDate?: string;
    assignedAgentUsername?: string;
    assignedAgentDisplayName?: string;
  };

  const existing = await getStoredPaymentById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<{
    amountTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    notes: string;
    paymentDate: string;
    nextDueDate: string;
    assignedAgentUsername: string;
    assignedAgentDisplayName: string;
  }> = {};

  if (body.amountTotal !== undefined) {
    patch.amountTotal = Number.isFinite(body.amountTotal) ? Math.trunc(body.amountTotal) : existing.amountTotal;
  }

  if (body.amountPaid !== undefined) {
    patch.amountPaid = Number.isFinite(body.amountPaid) ? Math.trunc(body.amountPaid) : existing.amountPaid;
  }

  if (body.balanceDue !== undefined) {
    patch.balanceDue = Number.isFinite(body.balanceDue) ? Math.trunc(body.balanceDue) : existing.balanceDue;
  }

  if (body.paymentMethod !== undefined) {
    patch.paymentMethod = body.paymentMethod;
  }

  if (body.paymentStatus !== undefined) {
    const normalized = body.paymentStatus.trim().toLowerCase();
    if (!["pending", "order_created", "authorized", "captured", "failed", "verification_failed", "refunded", "partially_refunded"].includes(normalized)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    patch.paymentStatus = normalized as PaymentStatus;
  }

  if (body.notes !== undefined) {
    patch.notes = body.notes;
  }

  if (body.paymentDate !== undefined) {
    patch.paymentDate = body.paymentDate;
  }

  if (body.nextDueDate !== undefined) {
    patch.nextDueDate = body.nextDueDate;
  }

  if (body.assignedAgentUsername !== undefined) {
    patch.assignedAgentUsername = body.assignedAgentUsername;
  }

  if (body.assignedAgentDisplayName !== undefined) {
    patch.assignedAgentDisplayName = body.assignedAgentDisplayName;
  }

  const updated = await updatePayment(id, patch, existing);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

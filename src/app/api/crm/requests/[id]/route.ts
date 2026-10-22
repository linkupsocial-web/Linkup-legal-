import { NextRequest, NextResponse } from "next/server";
import {
  getStoredRequestById,
  updateRequest,
  type RequestStatus,
} from "@/server/repositories/requests.supabase.repository";
import { getAvailableAgents } from "@/lib/crm-auth";
import { getCrmSession } from "@/lib/crm-session";
import { isRequestStatus } from "@/lib/request-status";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { status?: string; agentNote?: string; assignedAgentUsername?: string };

  const existing = await getStoredRequestById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin" && existing.assignedAgentUsername !== session.username) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Partial<{
    status: RequestStatus;
    agentNote: string;
    assignedAgentUsername: string;
    assignedAgentDisplayName: string;
  }> = {};

  if (body.status) {
    if (!isRequestStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    patch.status = body.status;
  }

  if (body.agentNote !== undefined) {
    patch.agentNote = body.agentNote;
  }

  if (session.role === "admin" && body.assignedAgentUsername !== undefined) {
    const agents = getAvailableAgents();
    const assignedAgentUsername = body.assignedAgentUsername.trim();

    if (assignedAgentUsername && !agents.some((agent) => agent.username === assignedAgentUsername)) {
      return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
    }

    const assignedAgent = agents.find((agent) => agent.username === assignedAgentUsername);
    patch.assignedAgentUsername = assignedAgentUsername;
    patch.assignedAgentDisplayName = assignedAgent?.displayName ?? "";
  } else if (session.role !== "admin" && body.assignedAgentUsername !== undefined) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await updateRequest(id, patch, existing);

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

import type { Agent, CrmSession } from "@/lib/crm-auth";
import type { CrmRequest } from "@/lib/crm-store";

export type CrmRequestView = CrmRequest & {
  assignedAgentDisplayName?: string;
  hasPayment?: boolean;
};

function resolveAgentDisplayName(username: string | null | undefined, agents: Agent[]): string {
  if (!username) return "";
  return agents.find((agent) => agent.username === username)?.displayName ?? username;
}

export function getVisibleRequests(requests: CrmRequest[], session: CrmSession): CrmRequest[] {
  if (session.role === "admin") {
    return [...requests];
  }

  return requests.filter((request) => request.assignedAgentUsername === session.username);
}

export function toRequestView(
  request: CrmRequest,
  session: CrmSession,
  agents: Agent[],
  hasPayment = false
): CrmRequestView {
  const assignedAgentDisplayName = resolveAgentDisplayName(request.assignedAgentUsername, agents);

  if (session.role === "admin") {
    return {
      ...request,
      assignedAgentDisplayName,
      hasPayment,
    };
  }

  return {
    id: request.id,
    service: request.service,
    price: request.price,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    agentNote: request.agentNote,
    assignedAgentUsername: request.assignedAgentUsername,
    assignedAgentDisplayName,
    name: "",
    phone: "",
    email: "",
    notes: "",
    hasPayment,
  };
}

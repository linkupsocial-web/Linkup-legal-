"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Agent, type CrmSession } from "@/lib/crm-auth";
import type { CrmRequestView } from "@/lib/crm-access";
import {
  ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Pencil, X, Save, Users,
} from "lucide-react";

interface PagedResponse {
  items: CrmRequestView[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_CONFIG = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  payment_completed: { label: "Payment Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-violet-100 text-violet-700 border-violet-200", icon: Users },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700 border-slate-200", icon: AlertCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
};

function StatusBadge({ status }: { status: CrmRequestView["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function EditRow({
  request,
  onSave,
  onCancel,
  session,
  agents,
}: {
  request: CrmRequestView;
  onSave: (id: string, status: string, note: string, assignedAgentUsername?: string) => Promise<void>;
  onCancel: () => void;
  session: CrmSession;
  agents: Agent[];
}) {
  const isAdmin = session.role === "admin";
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.agentNote ?? "");
  const [assignedAgentUsername, setAssignedAgentUsername] = useState(request.assignedAgentUsername ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(request.id, status, note, isAdmin ? assignedAgentUsername : undefined);
    setSaving(false);
  };

  return (
    <tr className="bg-blue-50/50 border-l-4 border-l-blue-500">
      <td className="px-4 py-4" colSpan={isAdmin ? 9 : 6}>
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Request</div>
            <div className="mt-1 font-medium text-sm">{request.service}</div>
            <div className="text-xs text-muted-foreground">{request.id}</div>
            {request.price > 0 ? (
              <div className="mt-1 text-xs font-medium text-emerald-700">
                ₹{request.price.toLocaleString("en-IN")}
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="rounded-lg border bg-background p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</div>
              <div className="mt-1 text-sm font-medium">{request.name || "—"}</div>
              <div className="text-xs text-muted-foreground">{request.phone || "—"}</div>
              <div className="text-xs text-muted-foreground">{request.email || "—"}</div>
              <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {request.notes || "No notes"}
              </div>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Assign agent</label>
              <select
                value={assignedAgentUsername}
                onChange={(e) => setAssignedAgentUsername(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.username} value={agent.username}>
                    {agent.displayName} ({agent.username})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CrmRequestView["status"])}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="new">New</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="payment_completed">Payment Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Agent note</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add agent note..."
              className="h-10 text-sm"
            />
          </div>

          <div className="flex gap-2 xl:col-span-4">
            <Button size="sm" onClick={save} disabled={saving} className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs">
              <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 w-8 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CrmRequestsTable({
  onStatsRefresh,
  session,
  agents,
  search,
  statusFilter,
  refreshKey,
}: {
  onStatsRefresh: () => void;
  session: CrmSession | null;
  agents: Agent[];
  search: string;
  statusFilter: string;
  refreshKey: number;
}) {
  const router = useRouter();
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movingToPaymentId, setMovingToPaymentId] = useState<string | null>(null);
  const previousFiltersRef = useRef({ search, statusFilter });

  const isAdmin = session?.role === "admin";
  const columnCount = isAdmin ? 9 : 6;

  const fetchData = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/crm/requests?${params}`);
      if (res.status === 401) {
        router.push("/crm/login");
        return;
      }

      const json = await res.json() as PagedResponse;
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, router, search, session, statusFilter]);

  useEffect(() => {
    const filtersChanged =
      previousFiltersRef.current.search !== search ||
      previousFiltersRef.current.statusFilter !== statusFilter;

    previousFiltersRef.current = { search, statusFilter };

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    if (!session) return;
    void fetchData();
  }, [fetchData, page, refreshKey, search, session, statusFilter]);

  const handleSave = async (id: string, status: string, agentNote: string, assignedAgentUsername?: string) => {
    await fetch(`/api/crm/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, agentNote, assignedAgentUsername }),
    });

    setEditingId(null);
    void fetchData();
    onStatsRefresh();
  };

  const handleMoveToPayment = async (requestId: string) => {
    setMovingToPaymentId(requestId);
    try {
      const res = await fetch("/api/crm/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (res.ok) {
        router.push("/crm/dashboard/payments");
      }
    } finally {
      setMovingToPaymentId(null);
    }
  };

  if (!session) {
    return null;
  }

  const headers = isAdmin
    ? ["Customer", "Date", "Phone / Email", "Notes", "Service", "Assigned Agent", "Status", "Agent Note", "Actions"]
    : ["Request", "Date", "Service", "Status", "Agent Note", "Actions"];

  const paymentButtonLabel = (request: CrmRequestView, moving = false) => {
    if (request.hasPayment) return "Payment Added";
    if (moving) return "Moving...";
    return "Payment";
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-semibold text-sm flex-1">
            {isAdmin ? "All Requests" : "My Assigned Requests"}
          </h2>
          <div className="text-xs text-muted-foreground">
            {statusFilter === "all" ? "Showing all status" : `Filtered by ${statusFilter}`}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(columnCount)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search || statusFilter !== "all" ? "No matching requests found." : "No requests yet. They will appear here once customers submit forms."}
                  </td>
                </tr>
              ) : data.items.map((req) =>
                editingId === req.id ? (
                  <EditRow
                    key={req.id}
                    request={req}
                    session={session}
                    agents={agents}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                  />
                ) : isAdmin ? (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{req.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{req.id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{req.phone || "—"}</div>
                      <div className="text-xs text-muted-foreground">{req.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <p className="text-xs text-muted-foreground truncate">{req.notes || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">{req.service}</span>
                      {req.price > 0 ? (
                        <div className="mt-1 text-[11px] text-emerald-700">
                          ₹{req.price.toLocaleString("en-IN")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">
                        {req.assignedAgentDisplayName || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-xs text-muted-foreground truncate">{req.agentNote || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveToPayment(req.id)}
                            disabled={Boolean(req.hasPayment) || movingToPaymentId === req.id}
                            className="h-7 px-2 text-[11px]"
                          >
                            {paymentButtonLabel(req, movingToPaymentId === req.id)}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(req.id)}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{req.id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">{req.service}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs text-muted-foreground truncate">{req.agentNote || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveToPayment(req.id)}
                            disabled={Boolean(req.hasPayment) || movingToPaymentId === req.id}
                            className="h-7 px-2 text-[11px]"
                          >
                            {paymentButtonLabel(req, movingToPaymentId === req.id)}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(req.id)}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, data.total)} of {data.total}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs px-2 flex items-center">{page} / {data.pages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="h-7 w-7 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

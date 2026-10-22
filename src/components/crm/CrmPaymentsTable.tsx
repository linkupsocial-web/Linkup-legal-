"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CrmSession } from "@/lib/crm-auth";
import type { CrmPayment } from "@/lib/crm-payments-store";
import { CheckCircle2, Clock3, Pencil, Save, X, CircleAlert } from "lucide-react";

interface PagedResponse {
  items: CrmPayment[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock3 },
  order_created: { label: "Order Created", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock3 },
  authorized: { label: "Authorized", color: "bg-violet-100 text-violet-700 border-violet-200", icon: CircleAlert },
  captured: { label: "Captured", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", icon: CircleAlert },
  verification_failed: { label: "Verification Failed", color: "bg-red-100 text-red-700 border-red-200", icon: CircleAlert },
  refunded: { label: "Refunded", color: "bg-slate-100 text-slate-700 border-slate-200", icon: CircleAlert },
  partially_refunded: { label: "Partially Refunded", color: "bg-slate-100 text-slate-700 border-slate-200", icon: CircleAlert },
} as const;

function formatAmount(value: number) {
  return value >= 0 ? `₹${value.toLocaleString("en-IN")}` : "—";
}

function PaymentStatusBadge({ status }: { status: CrmPayment["paymentStatus"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PaymentEditRow({
  payment,
  onSave,
  onCancel,
}: {
  payment: CrmPayment;
  onSave: (
    id: string,
    amountTotal: number,
    amountPaid: number,
    balanceDue: number,
    paymentMethod: string,
    paymentStatus: CrmPayment["paymentStatus"],
    notes: string,
    paymentDate: string,
    nextDueDate: string
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [amountTotal, setAmountTotal] = useState(String(payment.amountTotal ?? 0));
  const [amountPaid, setAmountPaid] = useState(String(payment.amountPaid ?? 0));
  const [paymentMethod, setPaymentMethod] = useState(payment.paymentMethod ?? "");
  const [paymentStatus, setPaymentStatus] = useState(payment.paymentStatus);
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [paymentDate, setPaymentDate] = useState(payment.paymentDate ? payment.paymentDate.slice(0, 10) : "");
  const [nextDueDate, setNextDueDate] = useState(payment.nextDueDate ? payment.nextDueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const parsedTotal = Number(amountTotal) || 0;
  const parsedPaid = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, parsedTotal - parsedPaid);

  const save = async () => {
    setSaving(true);
    await onSave(
      payment.id,
      parsedTotal,
      parsedPaid,
      balanceDue,
      paymentMethod,
      paymentStatus,
      notes,
      paymentDate,
      nextDueDate
    );
    setSaving(false);
  };

  return (
    <tr className="bg-blue-50/50 border-l-4 border-l-blue-500">
      <td className="px-4 py-4" colSpan={11}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment</div>
            <div className="mt-1 font-medium text-sm">{payment.customerName}</div>
            <div className="text-xs text-muted-foreground">{payment.id}</div>
            <div className="text-xs text-muted-foreground">Request: {payment.requestId}</div>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Service</div>
            <div className="mt-1 text-sm font-medium">{payment.serviceName}</div>
            <div className="text-xs text-muted-foreground">{payment.phone || "—"}</div>
            <div className="text-xs text-muted-foreground">{payment.assignedAgentDisplayName || "Unassigned"}</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount total</label>
            <Input
              type="number"
              min="0"
              value={amountTotal}
              onChange={(e) => setAmountTotal(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount paid</label>
            <Input
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Balance due</label>
            <Input value={formatAmount(balanceDue)} readOnly className="h-10 text-sm bg-muted/60" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Payment method</label>
            <Input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="UPI, Cash, Card..."
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Payment status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as CrmPayment["paymentStatus"])}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pending">Pending</option>
              <option value="authorized">Authorized</option>
              <option value="captured">Captured</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Payment date</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Next due date</label>
            <Input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment note..."
              className="h-10 text-sm"
            />
          </div>

          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
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

export default function CrmPaymentsTable({
  search,
  statusFilter,
  refreshKey,
  session,
}: {
  search: string;
  statusFilter: string;
  refreshKey: number;
  session: CrmSession | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const previousFiltersRef = useRef({ search, statusFilter });

  const isAdmin = session?.role === "admin";
  const columnCount = isAdmin ? 11 : 8;

  const fetchData = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/crm/payments?${params}`);
      if (res.status === 401) {
        router.push("/crm/login");
        return;
      }

      const json = (await res.json()) as PagedResponse;
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

  const handleSave = async (
    id: string,
    amountTotal: number,
    amountPaid: number,
    balanceDue: number,
    paymentMethod: string,
    paymentStatus: CrmPayment["paymentStatus"],
    notes: string,
    paymentDate: string,
    nextDueDate: string
  ) => {
    await fetch(`/api/crm/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountTotal,
        amountPaid,
        balanceDue,
        paymentMethod,
        paymentStatus,
        notes,
        paymentDate,
        nextDueDate,
      }),
    });

    setEditingId(null);
    void fetchData();
  };

  if (!session) {
    return null;
  }

  const headers = isAdmin
    ? ["Customer", "Service", "Total", "Paid", "Balance", "Method", "Status", "Payment Date", "Next Due", "Agent", "Actions"]
    : ["Request", "Service", "Total", "Paid", "Balance", "Method", "Status", "Notes"];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-semibold text-sm flex-1">{isAdmin ? "Payment Section" : "My Payments"}</h2>
          <div className="text-xs text-muted-foreground">
            {statusFilter === "all" ? "Showing all payment status" : `Filtered by ${statusFilter}`}
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
                    {search || statusFilter !== "all"
                      ? "No matching payments found."
                      : "No payments yet. Move a request to payment to create the first row."}
                  </td>
                </tr>
              ) : data.items.map((payment) =>
                  editingId === payment.id ? (
                    <PaymentEditRow key={payment.id} payment={payment} onSave={handleSave} onCancel={() => setEditingId(null)} />
                  ) : isAdmin ? (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{payment.customerName}</div>
                        <div className="text-xs text-muted-foreground">{payment.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{payment.serviceName}</div>
                        <div className="text-xs text-muted-foreground">{payment.requestId}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.amountTotal)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.amountPaid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.balanceDue)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">{payment.paymentMethod || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={payment.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {payment.paymentDate ? formatDate(payment.paymentDate) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {payment.nextDueDate ? formatDate(payment.nextDueDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">
                          {payment.assignedAgentDisplayName || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(payment.id)}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{payment.requestId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{payment.serviceName}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.amountTotal)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.amountPaid)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{formatAmount(payment.balanceDue)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium bg-muted rounded px-2 py-0.5">{payment.paymentMethod || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={payment.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-xs text-muted-foreground truncate">{payment.notes || "—"}</p>
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
                <span className="sr-only">Previous</span>
                <span aria-hidden="true">‹</span>
              </Button>
              <span className="text-xs px-2 flex items-center">{page} / {data.pages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="h-7 w-7 p-0">
                <span className="sr-only">Next</span>
                <span aria-hidden="true">›</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

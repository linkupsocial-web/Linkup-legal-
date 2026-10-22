"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Clock3, CheckCircle2, Sparkles, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Service } from "@/types/service";
import type { CrmSession } from "@/lib/crm-auth";
import { getServiceStatusLabel } from "@/lib/service-status";

type CrmService = Service & {
  createdAt: string;
  updatedAt: string;
};

interface PagedResponse {
  items: CrmService[];
  total: number;
  page: number;
  pages: number;
}

function formatAmount(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getServicePriority(priority: number | undefined) {
  return typeof priority === "number" && Number.isFinite(priority) ? priority : Number.MAX_SAFE_INTEGER;
}

function sortCrmServices(left: CrmService, right: CrmService) {
  const priorityDiff = getServicePriority(left.priority) - getServicePriority(right.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const updatedDiff = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return left.title.localeCompare(right.title);
}

function StatusBadge({ status }: { status: CrmService["status"] }) {
  if (status === "coming-soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Clock3 className="h-3 w-3" />
        Coming Soon
      </span>
    );
  }

  if (status === "disabled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
        <Ban className="h-3 w-3" />
        Disabled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </span>
  );
}

export default function CrmServicesTable({
  search,
  statusFilter,
  refreshKey,
  session,
  onEdit,
  onDelete,
}: {
  search: string;
  statusFilter: string;
  refreshKey: number;
  session: CrmSession | null;
  onEdit: (service: CrmService) => void;
  onDelete: (service: CrmService) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<PagedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const previousFiltersRef = useRef({ search, statusFilter });
  const previousRefreshKeyRef = useRef(refreshKey);

  const fetchData = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/crm/services?${params}`);
      if (res.status === 401) {
        router.push("/crm/login");
        return;
      }
      if (res.status === 403) {
        router.push("/crm/dashboard");
        return;
      }

      const json = (await res.json()) as PagedResponse;
      setData({
        ...json,
        items: [...json.items].sort(sortCrmServices),
      });
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

    if (previousRefreshKeyRef.current !== refreshKey) {
      previousRefreshKeyRef.current = refreshKey;

      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    if (!session) return;
    void fetchData();
  }, [fetchData, page, refreshKey, search, session, statusFilter]);

  if (!session || session.role !== "admin") {
    return null;
  }

  const headers = ["Service", "Priority", "Category", "Price", "Duration", "Popular", "Status", "Updated", "Actions"];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-semibold text-sm flex-1">Active Services</h2>
          <div className="text-xs text-muted-foreground">
            {statusFilter === "all" ? "Showing all services" : `Filtered by ${getServiceStatusLabel(statusFilter as CrmService["status"])}`}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    {[...Array(headers.length)].map((__, columnIndex) => (
                      <td key={columnIndex} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search || statusFilter !== "all"
                      ? "No matching services found."
                      : "No services yet. Add your first active service to populate this section."}
                  </td>
                </tr>
              ) : (
                data.items.map((service) => (
                  <tr key={service.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{service.title}</div>
                      <div className="text-xs text-muted-foreground">{service.slug}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                      {service.priority ?? 9999}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{service.category}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-40">{service.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                      {formatAmount(service.price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{service.duration}</td>
                    <td className="px-4 py-3">
                      {service.popular ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={service.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(service.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(service)}
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(service)}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {((page - 1) * 12) + 1}–{Math.min(page * 12, data.total)} of {data.total}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="h-7 w-7 p-0"
              >
                <span className="sr-only">Previous</span>
                <span aria-hidden="true">‹</span>
              </Button>
              <span className="flex items-center px-2 text-xs">
                {page} / {data.pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(data.pages, current + 1))}
                disabled={page === data.pages}
                className="h-7 w-7 p-0"
              >
                <span className="sr-only">Next</span>
                <span aria-hidden="true">›</span>
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

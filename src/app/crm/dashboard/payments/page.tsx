"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrmAuth } from "@/components/crm/CrmAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CrmDashboardShell from "@/components/crm/CrmDashboardShell";
import CrmPaymentsTable from "@/components/crm/CrmPaymentsTable";
import {
  CalendarDays,
  CalendarRange,
  Clock3,
  CheckCircle2,
  CircleAlert,
  IndianRupee,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

interface PaymentStats {
  total: number;
  pending: number;
  authorized: number;
  captured: number;
  failed: number;
  collected: number;
  totalDues: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  trend: { date: string; label: string; revenue: number; payments: number }[];
}

function formatAmount(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  subtext: string;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}

export default function CrmPaymentsPage() {
  const router = useRouter();
  const { session } = useCrmAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session && session.role !== "admin") {
      router.replace("/crm/dashboard");
    }
  }, [router, session]);

  const fetchStats = useCallback(async () => {
    if (!session) return;

    try {
      const res = await fetch("/api/crm/payments?stats=1");
      if (res.status === 401) {
        router.push("/crm/login");
        return;
      }

      const json = (await res.json()) as PaymentStats;
      setStats(json);
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }, [router, session]);

  useEffect(() => {
    if (!session || session.role !== "admin") return;

    setStatsLoading(true);
    void fetchStats();
  }, [fetchStats, session, tableRefreshKey]);

  if (session && session.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await fetch("/api/crm/auth", { method: "DELETE" });
    router.push("/crm/login");
  };

  const refreshedLabel = mounted ? lastRefresh.toLocaleTimeString() : "—";

  const handleRefresh = () => {
    setLastRefresh(new Date());
    setTableRefreshKey((value) => value + 1);
  };

  return (
    <CrmDashboardShell
      session={session}
      refreshedLabel={refreshedLabel}
      onRefresh={handleRefresh}
      onLogout={handleLogout}
    >
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(7)].map((_, index) => (
            <Card key={index} className="h-28 animate-pulse bg-muted" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Revenue"
              value={formatAmount(stats.collected)}
              icon={IndianRupee}
              subtext={`From ${stats.captured + stats.authorized} collected payments`}
            />
            <StatCard
              label="Total Dues"
              value={formatAmount(stats.totalDues)}
              icon={CircleAlert}
              subtext="Outstanding balance across all payments"
            />
            <StatCard
              label="Pending Payments"
              value={String(stats.pending)}
              icon={Clock3}
              subtext="Awaiting payment"
            />
            <StatCard
              label="Authorized Payments"
              value={String(stats.authorized)}
              icon={CircleAlert}
              subtext="Advance received, balance pending"
            />
            <StatCard
              label="Today Revenue"
              value={formatAmount(stats.todayRevenue)}
              icon={CalendarDays}
              subtext="Collected today"
            />
            <StatCard
              label="This Week"
              value={formatAmount(stats.weekRevenue)}
              icon={CalendarRange}
              subtext="Collected in the last 7 days"
            />
            <StatCard
              label="This Month"
              value={formatAmount(stats.monthRevenue)}
              icon={CalendarDays}
              subtext="Collected this month"
            />
            <StatCard
              label="Captured Payments"
              value={String(stats.captured)}
              icon={CheckCircle2}
              subtext="Completed transactions"
            />
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <LineChartIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Revenue Trend - Last 7 Days</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) => `₹${Math.round(value / 1000)}k`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value: number) => [formatAmount(value), "Revenue"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#0f2447"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                This line shows the amount collected per day from captured payments.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Payment Section</h1>
              <p className="text-xs text-muted-foreground">Create payment rows from requests and update payment method and status.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "authorized", label: "Authorized" },
                { key: "captured", label: "Captured" },
                { key: "failed", label: "Failed" },
                { key: "refunded", label: "Refunded" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === item.key
                      ? "bg-[#0f2447] text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative w-full sm:w-72">
              <Input
                placeholder={session?.role === "admin" ? "Search customer, phone, request..." : "Search service, request ID..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="h-10 text-xs">
              Refresh payments
            </Button>
          </div>
        </CardContent>
      </Card>

      <CrmPaymentsTable
        session={session}
        search={deferredSearch}
        statusFilter={statusFilter}
        refreshKey={tableRefreshKey}
      />
    </CrmDashboardShell>
  );
}

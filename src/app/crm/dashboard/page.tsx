"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Clock, CheckCircle2, AlertCircle,
  TrendingUp, FileText,
} from "lucide-react";
import { useCrmAuth } from "@/components/crm/CrmAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import CrmDashboardShell from "@/components/crm/CrmDashboardShell";

interface Stats {
  total: number;
  new: number;
  paymentPending: number;
  inProgress: number;
  completed: number;
  trend: { date: string; new: number; payment_pending: number; in_progress: number; completed: number }[];
  topServices: { name: string; count: number }[];
}

const STATUS_COLORS = { new: "#3b82f6", paymentPending: "#f59e0b", inProgress: "#8b5cf6", completed: "#22c55e" };

function StatCard({
  label, value, icon: Icon, color, subtext,
}: { label: string; value: number; icon: React.ElementType; color: string; subtext?: string }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ background: color + "20" }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export default function CrmDashboard() {
  const router = useRouter();
  const { session } = useCrmAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/requests?stats=1");
      if (res.status === 401) { router.push("/crm/login"); return; }
      const data = await res.json() as Stats;
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    void fetchStats();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchStats();
      }
    }, 120000);

    return () => window.clearInterval(interval);
  }, [fetchStats]);

  const handleLogout = async () => {
    await fetch("/api/crm/auth", { method: "DELETE" });
    router.push("/crm/login");
  };

  const pieData = stats
    ? [
        { name: "New", value: stats.new },
        { name: "Payment Pending", value: stats.paymentPending },
        { name: "In Progress", value: stats.inProgress },
        { name: "Completed", value: stats.completed },
      ].filter((d) => d.value > 0)
    : [];
  const pieColorMap: Record<string, string> = {
    New: STATUS_COLORS.new,
    "Payment Pending": STATUS_COLORS.paymentPending,
    "In Progress": STATUS_COLORS.inProgress,
    Completed: STATUS_COLORS.completed,
  };

  const satisfactionRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;
  const refreshedLabel = mounted ? lastRefresh.toLocaleTimeString() : "—";

  return (
    <CrmDashboardShell
      session={session}
      refreshedLabel={refreshedLabel}
      onRefresh={fetchStats}
      onLogout={handleLogout}
    >
      {/* Overview */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Requests" value={stats.total} icon={Users} color="#6366f1" subtext="All time" />
          <StatCard label="New" value={stats.new} icon={AlertCircle} color="#3b82f6" subtext="Awaiting assignment" />
          <StatCard label="Payment Pending" value={stats.paymentPending} icon={Clock} color="#f59e0b" subtext="Awaiting payment" />
          <StatCard label="In Progress" value={stats.inProgress} icon={Users} color="#8b5cf6" subtext="Assigned work" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="#22c55e" subtext={`${satisfactionRate}% completion rate`} />
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">7-Day Request Trend</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.trend} barSize={10} barGap={2}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Bar dataKey="new" fill={STATUS_COLORS.new} radius={[3, 3, 0, 0]} name="new" />
                  <Bar dataKey="payment_pending" fill={STATUS_COLORS.paymentPending} radius={[3, 3, 0, 0]} name="payment pending" />
                  <Bar dataKey="in_progress" fill={STATUS_COLORS.inProgress} radius={[3, 3, 0, 0]} name="in progress" />
                  <Bar dataKey="completed" fill={STATUS_COLORS.completed} radius={[3, 3, 0, 0]} name="completed" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                {[["New", STATUS_COLORS.new], ["Payment Pending", STATUS_COLORS.paymentPending], ["In Progress", STATUS_COLORS.inProgress], ["Completed", STATUS_COLORS.completed]].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Status Breakdown</span>
              </div>
              {stats.total === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No requests yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={pieColorMap[entry.name] ?? STATUS_COLORS.new} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend
                      iconSize={10}
                      wrapperStyle={{ fontSize: 11 }}
                      payload={pieData.map((entry) => ({
                        value: entry.name,
                        type: "circle" as const,
                        color: pieColorMap[entry.name] ?? STATUS_COLORS.new,
                      }))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {stats && stats.topServices.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Top Requested Services</span>
            </div>
            <div className="space-y-2">
              {stats.topServices.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sm text-foreground flex-1 truncate">{s.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 max-w-48">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${Math.round((s.count / (stats.topServices[0]?.count ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CrmDashboardShell>
  );
}

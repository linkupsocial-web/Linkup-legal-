"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, ClipboardList, LogOut, Menu, RefreshCw, X, ChevronRight, Layers3, IndianRupee } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CrmSession } from "@/lib/crm-auth";

type CrmDashboardShellProps = {
  session: CrmSession | null;
  refreshedLabel: string;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export default function CrmDashboardShell({
  session,
  refreshedLabel,
  onRefresh,
  onLogout,
  children,
}: CrmDashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = session?.role === "admin";
  const isOverview = pathname === "/crm/dashboard";
  const isRequests = pathname === "/crm/dashboard/allrequest";
  const isPayments = pathname === "/crm/dashboard/payments";
  const isServices = pathname === "/crm/dashboard/active-services";

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-[#0f2447] border-b border-blue-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-orange-500 flex items-center justify-center text-white font-bold text-sm">LL</div>
            <span className="text-white font-semibold text-sm">Linkup Legal CRM</span>
            <span className="hidden sm:inline text-blue-300 text-xs border border-blue-700 rounded px-2 py-0.5">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-300 text-xs hidden sm:inline">
              Refreshed {refreshedLabel}
            </span>
            {session ? (
              <span className="hidden md:inline text-blue-200 text-xs border border-blue-700 rounded px-2 py-0.5">
                {session.displayName} · {session.role}
              </span>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onRefresh} className="text-blue-200 hover:text-white hover:bg-blue-800 h-8 w-8 p-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onLogout} className="text-blue-200 hover:text-white hover:bg-blue-800 h-8 gap-1.5 text-xs">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setSidebarOpen((value) => !value)}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Close sections menu" : "Open sections menu"}
        className="fixed left-0 top-24 z-50 flex items-center gap-2 rounded-r-full border border-l-0 border-[#21365f] bg-[#0f2447] px-3 py-3 text-white shadow-lg transition-transform hover:translate-x-1"
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.16em]">
          Sections
        </span>
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[320px] overflow-y-auto bg-transparent px-3 py-4 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="h-full rounded-2xl border border-white/10 bg-[#101f3a] text-white shadow-2xl overflow-hidden backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-[#3b82f6] via-[#f59e0b] to-[#22c55e]" />
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f97316] text-sm font-bold text-white shadow-md shadow-black/20">
                LL
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">CRM Modules</p>
                <h2 className="truncate text-sm font-semibold text-white">Linkup Legal</h2>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Sections</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Switch between the overview charts, request workspace, payment board, and service manager.
              </p>
            </div>

            <nav className="grid gap-2">
              <Link
                href="/crm/dashboard"
                className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all ${
                  isOverview
                    ? "border-[#33548c] bg-[#17335f] text-white shadow-lg shadow-black/10"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isOverview ? "bg-white/10" : "bg-[#0b1730]"} `}>
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Overview</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOverview ? "translate-x-0 text-white/90" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                  </div>
                  <p className={`mt-0.5 text-[11px] ${isOverview ? "text-blue-100/80" : "text-slate-400"}`}>
                    Charts, totals, and trends
                  </p>
                </div>
              </Link>
              <Link
                href="/crm/dashboard/allrequest"
                className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all ${
                  isRequests
                    ? "border-[#33548c] bg-[#17335f] text-white shadow-lg shadow-black/10"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isRequests ? "bg-white/10" : "bg-[#0b1730]"} `}>
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">All Requests</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isRequests ? "translate-x-0 text-white/90" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                  </div>
                  <p className={`mt-0.5 text-[11px] ${isRequests ? "text-blue-100/80" : "text-slate-400"}`}>
                    Assign agents and update status
                  </p>
                </div>
              </Link>
              {isAdmin ? (
                <>
                  <Link
                    href="/crm/dashboard/payments"
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all ${
                      isPayments
                        ? "border-[#33548c] bg-[#17335f] text-white shadow-lg shadow-black/10"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isPayments ? "bg-white/10" : "bg-[#0b1730]"} `}>
                      <IndianRupee className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">Payments</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isPayments ? "translate-x-0 text-white/90" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                      </div>
                      <p className={`mt-0.5 text-[11px] ${isPayments ? "text-blue-100/80" : "text-slate-400"}`}>
                        Track money collected and payment method
                      </p>
                    </div>
                  </Link>
                  <Link
                    href="/crm/dashboard/active-services"
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all ${
                      isServices
                        ? "border-[#33548c] bg-[#17335f] text-white shadow-lg shadow-black/10"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isServices ? "bg-white/10" : "bg-[#0b1730]"} `}>
                      <Layers3 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">Active Services</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isServices ? "translate-x-0 text-white/90" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                      </div>
                      <p className={`mt-0.5 text-[11px] ${isServices ? "text-blue-100/80" : "text-slate-400"}`}>
                        Add, edit, and remove live services
                      </p>
                    </div>
                  </Link>
                </>
              ) : null}
            </nav>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs space-y-1.5 text-slate-300">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Workspace</p>
              <p className="font-semibold text-white">{session?.displayName ?? "Unknown"}</p>
              <p className="text-slate-300">{session?.role ?? "-"}</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                <Layers3 className="h-3.5 w-3.5 text-slate-300" />
                <span>Last refresh: {refreshedLabel}</span>
              </div>
            </div>
          </CardContent>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="space-y-6">{children}</section>
      </main>
    </div>
  );
}

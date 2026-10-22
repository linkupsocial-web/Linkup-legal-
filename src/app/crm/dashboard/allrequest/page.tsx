"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrmAuth } from "@/components/crm/CrmAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CrmDashboardShell from "@/components/crm/CrmDashboardShell";
import CrmRequestsTable from "@/components/crm/CrmRequestsTable";

type ServiceOption = {
  id: string;
  slug: string;
  title: string;
  price: number;
};

export default function CrmAllRequestsPage() {
  const router = useRouter();
  const { session, agents } = useCrmAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [addRequestOpen, setAddRequestOpen] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [newRequest, setNewRequest] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    price: "",
    notes: "",
  });
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!addRequestOpen || serviceOptions.length > 0) return;

    void (async () => {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) return;

        const json = await res.json() as { services?: ServiceOption[] };
        setServiceOptions(json.services ?? []);
      } catch {
        // ignore
      }
    })();
  }, [addRequestOpen, serviceOptions.length]);

  const handleLogout = async () => {
    await fetch("/api/crm/auth", { method: "DELETE" });
    router.push("/crm/login");
  };

  const refreshedLabel = mounted ? lastRefresh.toLocaleTimeString() : "—";

  const handleRefresh = () => {
    setLastRefresh(new Date());
    setTableRefreshKey((value) => value + 1);
  };

  const handleCreateRequest = async () => {
    if (!newRequest.name.trim() || !newRequest.phone.trim() || !newRequest.service.trim()) {
      return;
    }

    setIsCreatingRequest(true);
    try {
      const res = await fetch("/api/crm/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRequest.name,
          phone: newRequest.phone,
          email: newRequest.email,
          service: newRequest.service,
          price: Number(newRequest.price) || 0,
          notes: newRequest.notes,
        }),
      });

      if (!res.ok) {
        return;
      }

      setNewRequest({ name: "", phone: "", email: "", service: "", price: "", notes: "" });
      setAddRequestOpen(false);
      handleRefresh();
    } finally {
      setIsCreatingRequest(false);
    }
  };

  return (
    <CrmDashboardShell
      session={session}
      refreshedLabel={refreshedLabel}
      onRefresh={handleRefresh}
      onLogout={handleLogout}
    >
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">All Requests</h1>
              <p className="text-xs text-muted-foreground">Review requests, assign agents, and update status.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {session?.role === "admin" ? (
                <Dialog open={addRequestOpen} onOpenChange={setAddRequestOpen}>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 bg-[#0f2447] text-white hover:bg-[#132d58] text-xs"
                    onClick={() => setAddRequestOpen(true)}
                  >
                    Add Request
                  </Button>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Add Request</DialogTitle>
                      <DialogDescription>
                        Create a manual request for any customer and add it to the CRM.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Customer name"
                          value={newRequest.name}
                          onChange={(e) => setNewRequest((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                        <Input
                          placeholder="Phone"
                          value={newRequest.phone}
                          onChange={(e) => setNewRequest((prev) => ({ ...prev, phone: e.target.value }))}
                          required
                        />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email (optional)"
                        value={newRequest.email}
                        onChange={(e) => setNewRequest((prev) => ({ ...prev, email: e.target.value }))}
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Pick from services</label>
                        <select
                          value={newRequest.service}
                          onChange={(e) => {
                            const selected = serviceOptions.find((service) => service.title === e.target.value);
                            setNewRequest((prev) => ({
                              ...prev,
                              service: e.target.value,
                              price: selected ? String(selected.price) : prev.price,
                            }));
                          }}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select a service to auto-fill price</option>
                          {serviceOptions.map((service) => (
                            <option key={service.id} value={service.title}>
                              {service.title} {service.price > 0 ? `- ₹${service.price.toLocaleString("en-IN")}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        placeholder="Service name"
                        value={newRequest.service}
                        onChange={(e) => setNewRequest((prev) => ({ ...prev, service: e.target.value }))}
                        required
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Price"
                        value={newRequest.price}
                        onChange={(e) => setNewRequest((prev) => ({ ...prev, price: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Notes (optional)"
                        value={newRequest.notes}
                        onChange={(e) => setNewRequest((prev) => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddRequestOpen(false)}
                        disabled={isCreatingRequest}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleCreateRequest()}
                        disabled={isCreatingRequest}
                        className="bg-[#0f2447] text-white hover:bg-[#132d58]"
                      >
                        {isCreatingRequest ? "Saving..." : "Save Request"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
              {[
                { key: "all", label: "All" },
                { key: "new", label: "New" },
                { key: "payment_pending", label: "Payment Pending" },
                { key: "in_progress", label: "In Progress" },
                { key: "completed", label: "Completed" },
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
                placeholder={session?.role === "admin" ? "Search name, phone, ID..." : "Search service, request ID..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="h-10 text-xs">
              Refresh requests
            </Button>
          </div>
        </CardContent>
      </Card>

      <CrmRequestsTable
        onStatsRefresh={handleRefresh}
        session={session}
        agents={agents}
        search={deferredSearch}
        statusFilter={statusFilter}
        refreshKey={tableRefreshKey}
      />
    </CrmDashboardShell>
  );
}

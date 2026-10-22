"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCrmAuth } from "@/components/crm/CrmAuthProvider";
import CrmDashboardShell from "@/components/crm/CrmDashboardShell";
import CrmServicesTable from "@/components/crm/CrmServicesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import type { Service } from "@/types/service";
import { SERVICE_STATUS_OPTIONS, type ServiceStatus } from "@/lib/service-status";
import { SERVICE_PRICING_TYPES, type ServicePricingType } from "@/lib/service-pricing";
import { normalizeDelimitedServiceStringArray } from "@/lib/service-content";

type CrmService = Service & {
  createdAt: string;
  updatedAt: string;
};

type ServiceFormState = {
  title: string;
  slug: string;
  priority: string;
  description: string;
  category: string;
  icon: string;
  image: string;
  price: string;
  pricingType: ServicePricingType;
  duration: string;
  customersServed: string;
  requiredDocuments: string;
  features: string;
  popular: boolean;
  status: ServiceStatus;
};

function emptyServiceForm(): ServiceFormState {
  return {
    title: "",
    slug: "",
    priority: "9999",
    description: "",
    category: "",
    icon: "FileText",
    image: "",
    price: "0",
    pricingType: "quote_required",
    duration: "3-7 days",
    customersServed: "0",
    requiredDocuments: "",
    features: "",
    popular: false,
    status: "available",
  };
}

function serviceToForm(service: CrmService): ServiceFormState {
  return {
    title: service.title,
    slug: service.slug,
    priority: String(service.priority ?? 9999),
    description: service.description,
    category: service.category,
    icon: service.icon,
    image: service.image,
    price: String(service.price ?? 0),
    pricingType: service.pricingType ?? (service.price > 0 ? "fixed" : "quote_required"),
    duration: service.duration,
    customersServed: String(service.customersServed ?? 0),
    requiredDocuments: service.requiredDocuments.join("\n"),
    features: service.features.join("\n"),
    popular: Boolean(service.popular),
    status: service.status ?? "available",
  };
}

function splitList(value: string) {
  return normalizeDelimitedServiceStringArray(value);
}

export default function CrmActiveServicesPage() {
  const router = useRouter();
  const { session } = useCrmAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<CrmService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmService | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(emptyServiceForm());
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session && session.role !== "admin") {
      router.replace("/crm/dashboard");
    }
  }, [router, session]);

  const refreshedLabel = mounted ? lastRefresh.toLocaleTimeString() : "—";

  const handleLogout = async () => {
    await fetch("/api/crm/auth", { method: "DELETE" });
    router.push("/crm/login");
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    setTableRefreshKey((value) => value + 1);
  };

  const openAddDialog = () => {
    setEditingService(null);
    setForm(emptyServiceForm());
    setSelectedImageFile(null);
    setEditorOpen(true);
  };

  const openEditDialog = (service: CrmService) => {
    setEditingService(service);
    setForm(serviceToForm(service));
    setSelectedImageFile(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingService(null);
    setForm(emptyServiceForm());
    setSelectedImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleSaveService = async () => {
    if (!form.title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        priority: Number(form.priority) || 9999,
        description: form.description.trim(),
        category: form.category.trim(),
        icon: form.icon.trim(),
        image: form.image.trim(),
        price: Number(form.price) || 0,
        pricingType: form.pricingType,
        duration: form.duration.trim(),
        customersServed: Number(form.customersServed) || 0,
        requiredDocuments: splitList(form.requiredDocuments),
        features: splitList(form.features),
        popular: form.popular,
        status: form.status,
      };

      const endpoint = `/api/crm/services${editingService ? `/${editingService.id}` : ""}`;
      const res = selectedImageFile
        ? await (() => {
            const requestFormData = new FormData();
            requestFormData.append("payload", JSON.stringify(payload));
            requestFormData.append("image", selectedImageFile);
            return fetch(endpoint, {
              method: editingService ? "PATCH" : "POST",
              body: requestFormData,
            });
          })()
        : await fetch(endpoint, {
            method: editingService ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const response = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(response.error || "Could not save this service.");
      }

      closeEditor();
      handleRefresh();
      toast({
        title: editingService ? "Service updated" : "Service created",
        description: "The change was saved to Supabase.",
      });
    } catch (error) {
      toast({
        title: "Service save failed",
        description: error instanceof Error ? error.message : "Could not save this service.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/services/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const response = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(response.error || "Could not delete this service.");

      setDeleteTarget(null);
      handleRefresh();
      toast({ title: "Service deleted", description: "The service was removed from Supabase." });
    } catch (error) {
      toast({
        title: "Service delete failed",
        description: error instanceof Error ? error.message : "Could not delete this service.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/crm/services/export");
      if (!res.ok) {
        throw new Error("Failed to export services.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `crm-services-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export started",
        description: "Your services CSV has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export services.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCsv = async (file: File | null) => {
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/crm/services/import", {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();
      let payload: { created?: number; updated?: number; skipped?: number; error?: string } = {};
      if (responseText) {
        try {
          payload = JSON.parse(responseText) as typeof payload;
        } catch {
          payload = { error: responseText };
        }
      }

      if (!res.ok) {
        throw new Error(payload.error || "Could not import services.");
      }

      toast({
        title: "Import complete",
        description: `Created ${payload.created ?? 0}, updated ${payload.updated ?? 0}, skipped ${payload.skipped ?? 0}.`,
      });
      handleRefresh();
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not import services.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
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
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Active Services</h1>
              <p className="text-xs text-muted-foreground">
                Add, update, and delete services that are currently live on the public site.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 bg-[#0f2447] text-white hover:bg-[#132d58] text-xs"
                onClick={openAddDialog}
              >
                Add Service
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isImporting ? "Importing..." : "Import CSV"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => void handleExportCsv()}
                disabled={isExporting}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {isExporting ? "Exporting..." : "Export CSV"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void handleImportCsv(event.target.files?.[0] ?? null)}
              />
              {[
                { key: "all", label: "All" },
                ...SERVICE_STATUS_OPTIONS.map((option) => ({ key: option.value, label: option.label })),
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Input
                placeholder="Search service, category, slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="h-10 text-xs">
              Refresh services
            </Button>
          </div>
        </CardContent>
      </Card>

      <CrmServicesTable
        session={session}
        search={deferredSearch}
        statusFilter={statusFilter}
        refreshKey={tableRefreshKey}
        onEdit={openEditDialog}
        onDelete={setDeleteTarget}
      />

      <Dialog open={editorOpen} onOpenChange={(open) => (open ? setEditorOpen(true) : closeEditor())}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the live service details shown on the public site."
                : "Create a new service and make it available in the CRM and public services list."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Service title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <Input
                type="number"
                min="1"
                placeholder="Priority"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              />
            </div>

            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              />
              <Input
                placeholder="Icon name (e.g. FileText)"
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Image path or URL (optional)"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
              />
              <div className="space-y-1">
                <Input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setSelectedImageFile(event.target.files?.[0] ?? null)}
                />
                {selectedImageFile ? (
                  <p className="text-xs text-muted-foreground">Selected image: {selectedImageFile.name}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                type="number"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              />
              <select
                value={form.pricingType}
                onChange={(e) => setForm((prev) => ({ ...prev, pricingType: e.target.value as ServicePricingType }))}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {SERVICE_PRICING_TYPES.map((pricingType) => (
                  <option key={pricingType} value={pricingType}>
                    {pricingType.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Duration"
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
              />
              <Input
                type="number"
                min="0"
                placeholder="Customers served"
                value={form.customersServed}
                onChange={(e) => setForm((prev) => ({ ...prev, customersServed: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Required documents</label>
                <Textarea
                  placeholder="One item per line"
                  value={form.requiredDocuments}
                  onChange={(e) => setForm((prev) => ({ ...prev, requiredDocuments: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Features</label>
                <Textarea
                  placeholder="One item per line"
                  value={form.features}
                  onChange={(e) => setForm((prev) => ({ ...prev, features: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as ServiceStatus,
                    }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {SERVICE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm((prev) => ({ ...prev, popular: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Mark as popular
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveService()}
              disabled={isSaving}
              className="bg-[#0f2447] text-white hover:bg-[#132d58]"
            >
              {isSaving ? "Saving..." : editingService ? "Update Service" : "Save Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove "${deleteTarget.title}" from the active services list? This cannot be undone.`
                : "Remove this service from the active services list?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleDeleteService()}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmDashboardShell>
  );
}

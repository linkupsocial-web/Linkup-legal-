"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function CrmLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/crm/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setError("Invalid username or password. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/crm/dashboard");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2447] to-[#1a3a6b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Linkup Legal CRM</h1>
          <p className="text-blue-200 text-sm mt-1">Agent & Admin Portal</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-foreground mb-6">Sign in to your account</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Username</label>
                <Input
                  placeholder="Enter username"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-2">Auth setup:</p>
              <p>Admin login comes from <code className="bg-muted px-1 rounded">CRM_ADMIN_USER</code> and <code className="bg-muted px-1 rounded">CRM_ADMIN_PASS</code>.</p>
              <p>Agent 1 and Agent 2 can be set with <code className="bg-muted px-1 rounded">CRM_AGENT_USER</code> / <code className="bg-muted px-1 rounded">CRM_AGENT2_USER</code>.</p>
              <p>For more agents, use <code className="bg-muted px-1 rounded">CRM_AGENTS_JSON</code>.</p>
              <p className="text-orange-600 mt-2">⚠ Set real credentials in your .env file before going live.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CrmAuthProvider } from "@/components/crm/CrmAuthProvider";
import { getAvailableAgents } from "@/lib/crm-auth";
import { getServerCrmSession } from "@/lib/crm-session";

export default async function CrmDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerCrmSession();

  if (!session) {
    redirect("/crm/login");
  }

  return (
    <CrmAuthProvider initialSession={session} initialAgents={getAvailableAgents()}>
      {children}
    </CrmAuthProvider>
  );
}

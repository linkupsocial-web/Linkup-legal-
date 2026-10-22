"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Agent, CrmSession } from "@/lib/crm-auth";

type CrmAuthContextValue = {
  session: CrmSession;
  agents: Agent[];
};

const CrmAuthContext = createContext<CrmAuthContextValue | null>(null);

export function CrmAuthProvider({
  initialSession,
  initialAgents,
  children,
}: {
  initialSession: CrmSession;
  initialAgents: Agent[];
  children: ReactNode;
}) {
  return (
    <CrmAuthContext.Provider
      value={{
        session: initialSession,
        agents: initialAgents,
      }}
    >
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const value = useContext(CrmAuthContext);

  if (!value) {
    throw new Error("useCrmAuth must be used inside CrmAuthProvider.");
  }

  return value;
}

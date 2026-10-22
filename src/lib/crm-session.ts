import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { crmSessionOptions, type CrmSession, type CrmSessionState } from "@/lib/crm-auth";

type ReadonlyCookieStore = {
  get: (name: string) => { name: string; value: string } | undefined;
};

type IronCookieStore = ReadonlyCookieStore & {
  set: {
    (name: string, value: string, cookie?: Record<string, unknown>): void;
    (options: { name: string; value: string }): void;
  };
};

function toIronCookieStore(cookieStore: ReadonlyCookieStore): IronCookieStore {
  return {
    get: cookieStore.get.bind(cookieStore),
    set: () => {
      // Server component/layout reads never save or destroy sessions.
    },
  };
}

export async function getCrmSessionStore(req: NextRequest, res: NextResponse) {
  return getIronSession<CrmSessionState>(req, res, crmSessionOptions);
}

export async function getCrmSession(req: NextRequest): Promise<CrmSession | null> {
  const session = await getCrmSessionStore(req, new NextResponse());
  return session.user ?? null;
}

export async function getServerCrmSession(): Promise<CrmSession | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<CrmSessionState>(toIronCookieStore(cookieStore), crmSessionOptions);
  return session.user ?? null;
}

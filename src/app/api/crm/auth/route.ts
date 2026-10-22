import { NextRequest, NextResponse } from "next/server";
import { getAvailableAgents, verifyCredentials } from "@/lib/crm-auth";
import { getCrmSession, getCrmSessionStore } from "@/lib/crm-session";

export const dynamic = "force-dynamic";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const g = globalThis as typeof globalThis & {
  _crmLoginAttempts?: Map<string, { count: number; resetAt: number }>;
};

function getAttemptStore() {
  if (!g._crmLoginAttempts) {
    g._crmLoginAttempts = new Map();
  }

  return g._crmLoginAttempts;
}

function extractClientKey(req: NextRequest, username: string) {
  const ip =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  return `${ip}:${username.trim().toLowerCase()}`;
}

function checkRateLimit(key: string) {
  const store = getAttemptStore();
  const entry = store.get(key);
  const now = Date.now();

  if (!entry || entry.resetAt <= now) {
    store.delete(key);
    return null;
  }

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }

  return null;
}

function recordFailedAttempt(key: string) {
  const store = getAttemptStore();
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  store.set(key, { count: current.count + 1, resetAt: current.resetAt });
}

function clearFailedAttempts(key: string) {
  getAttemptStore().delete(key);
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username: string; password: string };
  const rateLimitKey = extractClientKey(req, username);
  const retryAfterSeconds = checkRateLimit(rateLimitKey);

  if (retryAfterSeconds !== null) {
    return NextResponse.json(
      { error: "Too many failed login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }

  const agent = verifyCredentials(username, password);

  if (!agent) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  clearFailedAttempts(rateLimitKey);

  const response = NextResponse.json({ success: true, agent });
  const session = await getCrmSessionStore(req, response);
  session.user = {
    username: agent.username,
    role: agent.role,
    displayName: agent.displayName,
  };
  session.issuedAt = Date.now();
  await session.save();

  return response;
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  const session = await getCrmSessionStore(req, response);
  session.destroy();
  return response;
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) {
    return NextResponse.json({ session: null, agents: getAvailableAgents() }, { status: 401 });
  }

  return NextResponse.json({ session, agents: getAvailableAgents() });
}

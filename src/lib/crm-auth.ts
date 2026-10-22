import { createHash } from "node:crypto";
import type { SessionOptions } from "iron-session";

// Simple CRM auth — credentials stored in env vars.
// For production: use NextAuth.js or Clerk with a real user table.

export interface Agent {
  username: string;
  role: "admin" | "agent";
  displayName: string;
}

interface AgentRecord extends Agent {
  password: string;
}

export interface CrmSession {
  username: string;
  role: "admin" | "agent";
  displayName: string;
}

export interface CrmSessionState {
  user?: CrmSession;
  issuedAt?: number;
}

const DEFAULT_CREDENTIALS = new Set(["admin", "admin123", "agent1", "agent123", "agent2", "agent456"]);

function requireEnvValue(name: string, fallback?: string): string {
  const rawValue = process.env[name]?.trim();
  const value = rawValue || fallback || "";

  if (!value) {
    throw new Error(`Missing required CRM environment variable: ${name}`);
  }

  return value;
}

function assertSafeCredential(name: string, value: string) {
  if (DEFAULT_CREDENTIALS.has(value)) {
    throw new Error(`Unsafe default CRM credential detected for ${name}. Set a unique production value in your environment.`);
  }
}

function assertStrongSessionSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error("CRM_SESSION_SECRET must be at least 32 characters long.");
  }

  if (secret === "change_this_before_production_please" || secret === "change_this_to_a_random_secret_string") {
    throw new Error("CRM_SESSION_SECRET must not use the default placeholder value.");
  }
}

const CRM_ADMIN_USER = requireEnvValue("CRM_ADMIN_USER");
const CRM_ADMIN_PASS = requireEnvValue("CRM_ADMIN_PASS");
const CRM_ADMIN_NAME = requireEnvValue("CRM_ADMIN_NAME", "Admin");
const CRM_AGENT_USER = requireEnvValue("CRM_AGENT_USER");
const CRM_AGENT_PASS = requireEnvValue("CRM_AGENT_PASS");
const CRM_AGENT_NAME = requireEnvValue("CRM_AGENT_NAME", "Agent 1");
const CRM_AGENT2_USER = requireEnvValue("CRM_AGENT2_USER");
const CRM_AGENT2_PASS = requireEnvValue("CRM_AGENT2_PASS");
const CRM_AGENT2_NAME = requireEnvValue("CRM_AGENT2_NAME", "Agent 2");

type ConfiguredAgentRecord = {
  username: string;
  password: string;
  role: "agent";
  displayName: string;
};

function parseAgentConfig(rawValue: string | undefined): ConfiguredAgentRecord[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as
      | Array<{ username?: string; password?: string; displayName?: string }>
      | { username?: string; password?: string; displayName?: string };
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    return entries
      .map((entry) => {
        const username = entry.username?.trim();
        const password = entry.password ?? "";
        if (!username || !password) return null;

        return {
          username,
          password,
          role: "agent" as const,
          displayName: entry.displayName?.trim() || username,
        };
      })
      .filter((entry): entry is ConfiguredAgentRecord => entry !== null);
  } catch {
    return [];
  }
}

function buildAgentRoster(): AgentRecord[] {
  assertSafeCredential("CRM_ADMIN_USER", CRM_ADMIN_USER);
  assertSafeCredential("CRM_ADMIN_PASS", CRM_ADMIN_PASS);
  assertSafeCredential("CRM_AGENT_USER", CRM_AGENT_USER);
  assertSafeCredential("CRM_AGENT_PASS", CRM_AGENT_PASS);
  assertSafeCredential("CRM_AGENT2_USER", CRM_AGENT2_USER);
  assertSafeCredential("CRM_AGENT2_PASS", CRM_AGENT2_PASS);

  const roster: AgentRecord[] = [
    {
      username: CRM_ADMIN_USER,
      password: CRM_ADMIN_PASS,
      role: "admin",
      displayName: CRM_ADMIN_NAME,
    },
  ];

  const configuredAgents = parseAgentConfig(process.env.CRM_AGENTS_JSON);

  if (configuredAgents.length > 0) {
    roster.push(...configuredAgents);
  } else {
    roster.push(
      {
        username: CRM_AGENT_USER,
        password: CRM_AGENT_PASS,
        role: "agent",
        displayName: CRM_AGENT_NAME,
      },
      {
        username: CRM_AGENT2_USER,
        password: CRM_AGENT2_PASS,
        role: "agent",
        displayName: CRM_AGENT2_NAME,
      }
    );
  }

  return roster.filter((agent, index, all) => all.findIndex((entry) => entry.username === agent.username) === index);
}

const AGENTS = buildAgentRoster();

export function getAvailableAgents(): Agent[] {
  return AGENTS.filter((agent) => agent.role === "agent").map((agent) => ({
    username: agent.username,
    role: agent.role,
    displayName: agent.displayName,
  }));
}

export function verifyCredentials(username: string, password: string): Agent | null {
  const agent = AGENTS.find((a) => a.username === username);
  if (!agent) return null;
  if (agent.password !== password) return null;

  return {
    username: agent.username,
    role: agent.role,
    displayName: agent.displayName,
  };
}

export const SESSION_COOKIE = "crm_session";
export const CRM_SESSION_TTL_SECONDS = 60 * 60 * 8;

const RAW_SESSION_SECRET = requireEnvValue("CRM_SESSION_SECRET");
assertStrongSessionSecret(RAW_SESSION_SECRET);
const SESSION_PASSWORD = createHash("sha256").update(RAW_SESSION_SECRET).digest("hex");

export const crmSessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE,
  password: SESSION_PASSWORD,
  ttl: CRM_SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const mutableEnvironment = process.env as Record<string, string | undefined>;

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const environmentKeys = [
  "NODE_ENV",
  "HCAPTCHA_SITE_KEY",
  "HCAPTCHA_SECRET_KEY",
  "HCAPTCHA_VERIFY_URL",
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

async function main() {
  try {
    const { verifyHcaptchaToken } = await import("./captcha.service.js");

    console.warn = () => undefined;
    mutableEnvironment.NODE_ENV = "test";
    process.env.HCAPTCHA_SITE_KEY = "test-hcaptcha-site-key";
    process.env.HCAPTCHA_SECRET_KEY = "test-hcaptcha-secret";
    delete process.env.HCAPTCHA_VERIFY_URL;

    let requestInit: RequestInit | undefined;
    globalThis.fetch = (async (_input, init) => {
      requestInit = init;
      return new Response(JSON.stringify({ success: true, hostname: "localhost", challenge_ts: "2026-07-30T12:00:00Z" }));
    }) as typeof fetch;

    const verified = await verifyHcaptchaToken("token-value", "203.0.113.10");
    assert.deepEqual(verified, {
      ok: true,
      hostname: "localhost",
      challengeTs: "2026-07-30T12:00:00Z",
    });
    assert.equal(requestInit?.cache, "no-store");
    const requestBody = new URLSearchParams(String(requestInit?.body));
    assert.equal(requestBody.get("secret"), "test-hcaptcha-secret");
    assert.equal(requestBody.get("response"), "token-value");
    assert.equal(requestBody.get("remoteip"), "203.0.113.10");
    assert.equal(requestBody.get("sitekey"), "test-hcaptcha-site-key");

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }))) as typeof fetch;
    assert.deepEqual(await verifyHcaptchaToken("token-value"), {
      ok: false,
      reason: "invalid_input_response",
      errors: ["invalid-input-response"],
    });

    assert.deepEqual(await verifyHcaptchaToken(""), { ok: false, reason: "missing_token" });

    delete process.env.HCAPTCHA_SECRET_KEY;
    mutableEnvironment.NODE_ENV = "production";
    assert.deepEqual(await verifyHcaptchaToken("token-value"), { ok: false, reason: "not_configured" });

    mutableEnvironment.NODE_ENV = "development";
    assert.deepEqual(await verifyHcaptchaToken("token-value"), { ok: true });
  } finally {
    for (const key of environmentKeys) {
      const value = originalEnvironment.get(key);
      if (value === undefined) delete mutableEnvironment[key];
      else mutableEnvironment[key] = value;
    }
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    moduleLoader._load = originalLoad;
  }

  console.log("hcaptcha verifier: OK");
}

void main().catch((error) => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const originalLoad = moduleLoader._load;
moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => request === "server-only" ? {} : originalLoad(request, parent, isMain);

async function main() {
  try {
    const { checkRateLimit } = await import("./rate-limit.js");
    assert.equal(checkRateLimit({ key: "rate-limit-test", limit: 2, windowMs: 1_000, now: 1_000 }).allowed, true);
    assert.equal(checkRateLimit({ key: "rate-limit-test", limit: 2, windowMs: 1_000, now: 1_001 }).allowed, true);
    const rejected = checkRateLimit({ key: "rate-limit-test", limit: 2, windowMs: 1_000, now: 1_002 });
    assert.equal(rejected.allowed, false);
    assert.equal(rejected.retryAfterSeconds, 1);
    assert.equal(checkRateLimit({ key: "rate-limit-test", limit: 2, windowMs: 1_000, now: 2_001 }).allowed, true);
  } finally {
    moduleLoader._load = originalLoad;
  }

  console.log("rate limiter: OK");
}

void main().catch((error) => {
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

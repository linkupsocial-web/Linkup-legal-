import assert from "node:assert/strict";
import Module from "node:module";

const moduleLoader = Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const originalLoad = moduleLoader._load;
moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => request === "server-only" ? {} : originalLoad(request, parent, isMain);

async function main() {
  try {
    const { CHECKOUT_TOKEN_TTL_MS, createCheckoutToken, matchesCheckoutToken } = await import("./checkout-token.js");
    const created = createCheckoutToken(1_000);
    assert.equal(created.value.length >= 43, true);
    assert.equal(created.hash.length, 64);
    assert.equal(created.expiresAt, new Date(1_000 + CHECKOUT_TOKEN_TTL_MS).toISOString());
    assert.equal(matchesCheckoutToken(created.value, created.hash), true);
    assert.equal(matchesCheckoutToken(`${created.value}x`, created.hash), false);
  } finally {
    moduleLoader._load = originalLoad;
  }

  console.log("checkout token helpers: OK");
}

void main().catch((error) => {
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

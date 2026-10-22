import assert from "node:assert/strict";
import { isSafeInternalCheckoutUrl } from "./checkout-url";

const origin = "https://www.linkuplegal.com";
const token = "x".repeat(43);

assert.equal(isSafeInternalCheckoutUrl(`/checkout/LL-20260803-236091?token=${token}`, origin), true);
assert.equal(isSafeInternalCheckoutUrl(`https://www.linkuplegal.com/checkout/LL-20260803-236091?token=${token}`, origin), true);
assert.equal(isSafeInternalCheckoutUrl(`https://evil.example/checkout/LL-20260803-236091?token=${token}`, origin), false);
assert.equal(isSafeInternalCheckoutUrl(`/services/trademark-registration?token=${token}`, origin), false);
assert.equal(isSafeInternalCheckoutUrl(`/checkout/LL-20260803-236091?token=short`, origin), false);

console.log("checkout URL validation: OK");

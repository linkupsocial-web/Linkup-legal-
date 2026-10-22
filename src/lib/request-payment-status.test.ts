import assert from "node:assert/strict";
import { normalizePaymentStatus } from "./payment-status";
import { normalizeRequestStatus } from "./request-status";
import { getPricingUnavailableCode, isPayablePricing, normalizeServicePricingType } from "./service-pricing";

assert.equal(normalizeRequestStatus("requested"), "new");
assert.equal(normalizeRequestStatus("visited"), "in_progress");
assert.equal(normalizeRequestStatus("payment_pending"), "payment_pending");
assert.equal(normalizePaymentStatus("paid"), "captured");
assert.equal(normalizePaymentStatus("partial"), "authorized");
assert.equal(normalizePaymentStatus("verification_failed"), "verification_failed");
assert.equal(normalizeServicePricingType(undefined, 9500), "fixed");
assert.equal(normalizeServicePricingType(undefined, 0), "quote_required");
assert.equal(isPayablePricing("fixed", 9500), true);
assert.equal(isPayablePricing("range", 9500), false);
assert.equal(getPricingUnavailableCode("range"), "QUOTE_REQUIRED");
assert.equal(getPricingUnavailableCode("not_applicable"), "PAYMENT_NOT_AVAILABLE");

console.log("request/payment status and pricing helpers: OK");

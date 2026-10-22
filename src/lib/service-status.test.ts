import assert from "node:assert/strict";
import {
  SERVICE_STATUS_OPTIONS,
  getServiceStatusLabel,
  isPublicServiceStatus,
  normalizeServiceStatus,
  parseServiceStatus,
} from "./service-status";

assert.deepEqual(
  SERVICE_STATUS_OPTIONS.map((option) => option.value),
  ["available", "coming-soon", "disabled"]
);

assert.equal(parseServiceStatus("available"), "available");
assert.equal(parseServiceStatus("Active"), "available");
assert.equal(parseServiceStatus("coming-soon"), "coming-soon");
assert.equal(parseServiceStatus("Coming Soon"), "coming-soon");
assert.equal(parseServiceStatus("coming_soon"), "coming-soon");
assert.equal(parseServiceStatus("Disabled"), "disabled");
assert.equal(parseServiceStatus("unknown"), null);

assert.equal(normalizeServiceStatus("unknown"), "available");
assert.equal(getServiceStatusLabel("disabled"), "Disabled");

assert.equal(isPublicServiceStatus(undefined), true);
assert.equal(isPublicServiceStatus("available"), true);
assert.equal(isPublicServiceStatus("coming-soon"), false);
assert.equal(isPublicServiceStatus("disabled"), false);

console.log("service-status utilities: OK");

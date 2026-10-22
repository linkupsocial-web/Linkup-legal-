import assert from "node:assert/strict";
import { generateRequestNumber, isRequestNumber } from "./request-number.js";

const requestNumber = generateRequestNumber(new Date("2026-07-29T10:30:00.000Z"));

assert.match(requestNumber, /^LL-20260729-\d{6}$/);
assert.equal(isRequestNumber(requestNumber), true);
assert.equal(isRequestNumber("LL-20260729-12345"), false);
assert.equal(isRequestNumber("ll-20260729-123456"), false);
assert.equal(isRequestNumber("LL-20260230-123456"), true);
assert.equal(isRequestNumber(null), false);

console.log("request-number helper: OK");

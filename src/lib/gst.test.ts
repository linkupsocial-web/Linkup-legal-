import assert from "node:assert/strict";
import { calculateGst } from "./gst.js";

assert.deepEqual(calculateGst(1000), {
  baseAmount: 1000,
  gstRate: 18,
  gstAmount: 180,
  totalAmount: 1180,
});

assert.deepEqual(calculateGst(-100), {
  baseAmount: 0,
  gstRate: 18,
  gstAmount: 0,
  totalAmount: 0,
});

console.log("gst helper: OK");

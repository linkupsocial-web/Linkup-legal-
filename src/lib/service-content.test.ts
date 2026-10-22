import assert from "node:assert/strict";
import {
  containsUnsafeServiceText,
  normalizeDelimitedServiceStringArray,
  normalizeJsonStringArray,
  normalizeServiceImage,
  normalizeServiceStringArray,
} from "./service-content";

assert.deepEqual(normalizeJsonStringArray([" Name approval ", "DSC support", "name approval", ""]), [
  "Name approval",
  "DSC support",
]);
assert.deepEqual(normalizeJsonStringArray('["Name approval","DSC support"]'), ["Name approval", "DSC support"]);
assert.deepEqual(normalizeJsonStringArray('"[\\"Name approval\\",\\"DSC support\\"]"'), [
  "Name approval",
  "DSC support",
]);
assert.deepEqual(normalizeJsonStringArray(null), []);
assert.deepEqual(normalizeJsonStringArray("not json"), []);
assert.deepEqual(normalizeDelimitedServiceStringArray("One\nTwo|Two,Three"), ["One", "Two", "Three"]);
assert.deepEqual(normalizeServiceStringArray(["Safe", "<strong>Unsafe</strong>", "safe"]), ["Safe"]);
assert.equal(containsUnsafeServiceText(["Safe", "<script>alert(1)</script>"]), true);

assert.equal(normalizeServiceImage("/services/placeholders/gst-registration.svg"), "/services/placeholders/gst-registration.svg");
assert.equal(normalizeServiceImage("https://cdn.example.com/gst.svg"), "https://cdn.example.com/gst.svg");
assert.equal(normalizeServiceImage("javascript:alert(1)"), "");
assert.equal(normalizeServiceImage("/services/../private.svg"), "");

console.log("service-content normalization: OK");

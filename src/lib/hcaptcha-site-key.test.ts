import assert from "node:assert/strict";
import { resolveHcaptchaSiteKey } from "./hcaptcha-site-key";

assert.equal(resolveHcaptchaSiteKey(" public-key ", "configured-key"), "public-key");
assert.equal(resolveHcaptchaSiteKey("", " configured-key "), "configured-key");
assert.equal(resolveHcaptchaSiteKey(undefined, undefined), "");

console.log("hCaptcha site key resolution: OK");

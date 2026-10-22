import assert from "node:assert/strict";
import { getSiteUrl, toAbsoluteUrl } from "./site-url";

delete process.env.NEXT_PUBLIC_SITE_URL;
assert.equal(getSiteUrl(), null);

delete process.env.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "not-a-valid-url";
assert.equal(getSiteUrl(), null);

delete process.env.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/some/path?x=1";
assert.equal(getSiteUrl(), "https://example.com");

delete process.env.NEXT_PUBLIC_SITE_URL;
assert.equal(toAbsoluteUrl("/services"), "/services");

delete process.env.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
assert.equal(toAbsoluteUrl("/services"), "https://example.com/services");

console.log("site-url utilities: OK");

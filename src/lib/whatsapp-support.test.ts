import assert from "node:assert/strict";
import { getWhatsAppSupportHref } from "./whatsapp-support";

assert.equal(getWhatsAppSupportHref("+91 98765 43210", "Hello"), "https://wa.me/919876543210?text=Hello");
assert.equal(getWhatsAppSupportHref("", "Hello"), null);

console.log("WhatsApp support link: OK");

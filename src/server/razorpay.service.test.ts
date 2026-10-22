import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Module from "node:module";

const moduleLoader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleLoader._load;

moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const environmentKeys = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

async function main() {
  try {
    process.env.RAZORPAY_KEY_ID = "rzp_test_checkout_key";
    process.env.RAZORPAY_KEY_ID = "rzp_test_checkout_key";
    process.env.RAZORPAY_KEY_SECRET = "checkout-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";

    const {
      getRazorpayPublicKeyId,
      isRazorpayCheckoutConfigured,
      isRazorpayWebhookConfigured,
      toRazorpayAmountPaise,
      verifyRazorpayPaymentSignature,
      verifyRazorpayWebhookSignature,
    } = await import("./razorpay.service.js");

    const orderId = "order_ABC123456";
    const paymentId = "pay_ABC123456";
    const paymentSignature = createHmac("sha256", "checkout-secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const webhookBody = '{"event":"payment.captured"}';
    const webhookSignature = createHmac("sha256", "webhook-secret").update(webhookBody).digest("hex");

    assert.equal(isRazorpayCheckoutConfigured(), true);
    assert.equal(isRazorpayWebhookConfigured(), true);
    assert.equal(getRazorpayPublicKeyId(), "rzp_test_checkout_key");
    assert.equal(toRazorpayAmountPaise(1180.25), 118025);
    assert.equal(toRazorpayAmountPaise(-1), 0);
    assert.equal(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: paymentSignature }), true);
    assert.equal(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: "invalid" }), false);
    assert.equal(verifyRazorpayWebhookSignature(webhookBody, webhookSignature), true);
    assert.equal(verifyRazorpayWebhookSignature(webhookBody, paymentSignature), false);
  } finally {
    for (const key of environmentKeys) {
      const value = originalEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    moduleLoader._load = originalLoad;
  }

  console.log("razorpay helpers: OK");
}

void main().catch((error) => {
  moduleLoader._load = originalLoad;
  console.error(error);
  process.exit(1);
});

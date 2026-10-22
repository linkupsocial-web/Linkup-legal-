import { NextRequest, NextResponse } from "next/server";
import { isRequestNumber } from "@/lib/request-number";
import {
  finalizeRazorpayPayment,
  getRazorpayPaymentByOrderId,
} from "@/server/repositories/payments.supabase.repository";
import { getCheckoutRequest } from "@/server/repositories/requests.supabase.repository";
import { isSupabaseStorageEnabled } from "@/server/repositories/storage-mode";
import { checkRateLimit } from "@/server/rate-limit";
import {
  getRazorpayPayment,
  isRazorpayCheckoutConfigured,
  toRazorpayAmountPaise,
  verifyRazorpayPaymentSignature,
} from "@/server/razorpay.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const providerIdPattern = /^(?:order|pay)_[A-Za-z0-9_]{6,128}$/;
const signaturePattern = /^[a-f0-9]{64}$/i;

type VerificationInput = {
  requestNumber: string;
  checkoutToken: string;
  orderId: string;
  paymentId: string;
  signature: string;
};

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function readVerificationInput(body: unknown): VerificationInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const requestNumber = typeof source.requestNumber === "string" ? source.requestNumber.trim() : "";
  const checkoutToken = typeof source.checkoutToken === "string" ? source.checkoutToken.trim() : "";
  const orderId = typeof source.razorpayOrderId === "string" ? source.razorpayOrderId.trim() : "";
  const paymentId = typeof source.razorpayPaymentId === "string" ? source.razorpayPaymentId.trim() : "";
  const signature = typeof source.razorpaySignature === "string" ? source.razorpaySignature.trim() : "";

  if (!isRequestNumber(requestNumber) || !/^[A-Za-z0-9_-]{43,128}$/.test(checkoutToken) || !providerIdPattern.test(orderId) || !providerIdPattern.test(paymentId) || !signaturePattern.test(signature)) {
    return null;
  }
  return { requestNumber, checkoutToken, orderId, paymentId, signature };
}

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
  const rateLimit = checkRateLimit({ key: `payment-verify:${clientKey}`, limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) return response({ ok: false, code: "RATE_LIMITED", message: "Please wait before verifying payment again." }, 429);

  if (!isSupabaseStorageEnabled() || !isRazorpayCheckoutConfigured()) {
    return response({ ok: false, code: "PAYMENT_UNAVAILABLE", message: "Online payment is not available." }, 503);
  }

  const input = readVerificationInput(await request.json().catch(() => null));
  if (!input) return response({ ok: false, code: "INVALID_REQUEST", message: "Invalid payment verification details." }, 400);

  try {
    const checkoutRequest = await getCheckoutRequest(input.requestNumber, input.checkoutToken);
    if (!checkoutRequest) return response({ ok: false, code: "INVALID_CHECKOUT_TOKEN", message: "This checkout link is unavailable." }, 403);

    const payment = await getRazorpayPaymentByOrderId(input.orderId);
    if (!payment || payment.requestNumber !== input.requestNumber || payment.providerOrderId !== input.orderId) {
      return response({ ok: false, code: "PAYMENT_NOT_FOUND", message: "Payment order was not found." }, 404);
    }

    if (payment.status === "captured") {
      if (payment.providerPaymentId && payment.providerPaymentId !== input.paymentId) {
        return response({ ok: false, code: "PAYMENT_ALREADY_FINAL", message: "Payment has already been confirmed." }, 409);
      }
      return response({ ok: true, status: "captured", requestNumber: payment.requestNumber, idempotent: true });
    }

    if (!verifyRazorpayPaymentSignature({ orderId: input.orderId, paymentId: input.paymentId, signature: input.signature })) {
      return response({ ok: false, code: "SIGNATURE_INVALID", message: "Payment verification failed." }, 400);
    }

    const providerPayment = await getRazorpayPayment(input.paymentId);
    const expectedAmount = toRazorpayAmountPaise(checkoutRequest.totalAmount);
    if (
      providerPayment.orderId !== input.orderId ||
      providerPayment.amount !== expectedAmount ||
      providerPayment.currency !== checkoutRequest.currency ||
      !["authorized", "captured"].includes(providerPayment.status)
    ) {
      console.error("razorpay_payment_reconciliation_failed", { requestNumber: input.requestNumber, reason: "provider_mismatch" });
      return response({ ok: false, code: "PAYMENT_RECONCILIATION_FAILED", message: "Payment could not be confirmed." }, 409);
    }

    const status = providerPayment.status === "captured" ? "captured" : "authorized";
    const updated = await finalizeRazorpayPayment({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
      status,
      method: providerPayment.method,
    });
    if (!updated) return response({ ok: false, code: "PAYMENT_NOT_FOUND", message: "Payment could not be confirmed." }, 409);

    return response({ ok: true, status: updated.status, requestNumber: updated.requestNumber });
  } catch {
    console.error("razorpay_verify_failed", { requestNumber: input.requestNumber, code: "PAYMENT_VERIFICATION_FAILED" });
    return response({ ok: false, code: "PAYMENT_VERIFICATION_FAILED", message: "Payment verification is temporarily unavailable." }, 502);
  }
}

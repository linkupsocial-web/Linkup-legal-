import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isRequestNumber } from "@/lib/request-number";
import { getPricingUnavailableCode, isPayablePricing } from "@/lib/service-pricing";
import {
  attachRazorpayOrder,
  claimRazorpayPaymentAttempt,
  failRazorpayPaymentAttempt,
} from "@/server/repositories/payments.supabase.repository";
import { getCheckoutRequest } from "@/server/repositories/requests.supabase.repository";
import { isSupabaseStorageEnabled } from "@/server/repositories/storage-mode";
import { checkRateLimit } from "@/server/rate-limit";
import {
  createRazorpayOrder,
  getRazorpayPublicKeyId,
  isRazorpayCheckoutConfigured,
  toRazorpayAmountPaise,
} from "@/server/razorpay.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function readInput(body: unknown): { requestNumber: string; checkoutToken: string } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const requestNumber = typeof source.requestNumber === "string" ? source.requestNumber.trim() : "";
  const checkoutToken = typeof source.checkoutToken === "string" ? source.checkoutToken.trim() : "";
  if (!isRequestNumber(requestNumber) || !/^[A-Za-z0-9_-]{43,128}$/.test(checkoutToken)) return null;
  return { requestNumber, checkoutToken };
}

function clientKey(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({ key: `payment-order:${clientKey(request)}`, limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return response({ ok: false, code: "RATE_LIMITED", message: "Please wait before trying payment again." }, 429);
  }

  if (!isSupabaseStorageEnabled() || !isRazorpayCheckoutConfigured()) {
    return response({ ok: false, code: "PAYMENT_UNAVAILABLE", message: "Online payment is temporarily unavailable." }, 503);
  }

  const body = await request.json().catch(() => null);
  const input = readInput(body);
  if (!input) return response({ ok: false, code: "INVALID_REQUEST", message: "Invalid payment request." }, 400);

  let claimedPaymentId: string | null = null;
  let providerOrderCreated = false;
  try {
    const checkoutRequest = await getCheckoutRequest(input.requestNumber, input.checkoutToken);
    if (!checkoutRequest) {
      return response({ ok: false, code: "INVALID_CHECKOUT_TOKEN", message: "This checkout link is unavailable." }, 403);
    }

    if (!isPayablePricing(checkoutRequest.pricingType, checkoutRequest.totalAmount)) {
      const code = getPricingUnavailableCode(checkoutRequest.pricingType);
      return response({ ok: false, code, message: "The final price must be confirmed before payment." }, 409);
    }

    if (["captured", "refunded", "partially_refunded"].includes(checkoutRequest.paymentStatus)) {
      return response({ ok: false, code: "PAYMENT_ALREADY_FINAL", message: "This payment cannot be started again." }, 409);
    }

    const amount = toRazorpayAmountPaise(checkoutRequest.totalAmount);
    if (!amount) {
      return response({ ok: false, code: "QUOTE_REQUIRED", message: "The final price must be confirmed before payment." }, 409);
    }

    const attempt = await claimRazorpayPaymentAttempt({
      requestNumber: checkoutRequest.requestNumber,
      idempotencyKey: randomUUID(),
    });
    claimedPaymentId = attempt.id;

    if (attempt.providerOrderId) {
      return response({
        ok: true,
        orderId: attempt.providerOrderId,
        amount,
        currency: attempt.currency,
        keyId: getRazorpayPublicKeyId(),
        requestNumber: checkoutRequest.requestNumber,
        idempotent: true,
      });
    }

    if (!attempt.created) {
      return response({ ok: false, code: "PAYMENT_IN_PROGRESS", message: "Your payment order is being prepared. Please wait a moment." }, 409);
    }

    const order = await createRazorpayOrder({
      amount,
      currency: checkoutRequest.currency,
      receipt: checkoutRequest.requestNumber,
      notes: { request_number: checkoutRequest.requestNumber },
    });
    providerOrderCreated = true;

    if (order.amount !== amount || order.currency !== checkoutRequest.currency) {
      console.error("razorpay_order_reconciliation_failed", { requestNumber: checkoutRequest.requestNumber, reason: "amount_or_currency_mismatch" });
      return response({ ok: false, code: "PAYMENT_RECONCILIATION_FAILED", message: "Unable to prepare payment right now." }, 502);
    }

    await attachRazorpayOrder({ paymentId: attempt.id, orderId: order.id });

    return response({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayPublicKeyId(),
      requestNumber: checkoutRequest.requestNumber,
    });
  } catch {
    if (claimedPaymentId && !providerOrderCreated) {
      await failRazorpayPaymentAttempt({ paymentId: claimedPaymentId, reason: "Razorpay order creation failed." }).catch(() => undefined);
    }
    console.error("razorpay_create_order_failed", { requestNumber: input.requestNumber, code: "ORDER_CREATION_FAILED" });
    return response({ ok: false, code: "ORDER_CREATION_FAILED", message: "Unable to start payment right now. Please try again." }, 502);
  }
}

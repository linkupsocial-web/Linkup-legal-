import { NextRequest, NextResponse } from "next/server";
import { isRequestNumber } from "@/lib/request-number";
import { getRazorpayPaymentByOrderId, recordRazorpayWebhookEvent } from "@/server/repositories/payments.supabase.repository";
import { isSupabaseStorageEnabled } from "@/server/repositories/storage-mode";
import { isRazorpayWebhookConfigured, toRazorpayAmountPaise, verifyRazorpayWebhookSignature } from "@/server/razorpay.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };
type UnknownRecord = Record<string, unknown>;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readAmount(record: UnknownRecord | undefined): number | undefined {
  const value = record?.amount;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function getEntity(payload: UnknownRecord, name: string): UnknownRecord | undefined {
  const container = payload.payload;
  if (!isRecord(container)) return undefined;
  const entry = container[name];
  return isRecord(entry) && isRecord(entry.entity) ? entry.entity : undefined;
}

function getWebhookStatus(eventType: string): "captured" | "failed" | "refunded" | "partially_refunded" | null {
  if (eventType === "payment.captured" || eventType === "order.paid") return "captured";
  if (eventType === "payment.failed") return "failed";
  if (eventType === "refund.processed") return "refunded";
  if (eventType === "refund.created") return "partially_refunded";
  return null;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseStorageEnabled() || !isRazorpayWebhookConfigured()) {
    return response({ ok: false, code: "WEBHOOK_UNAVAILABLE", message: "Webhook processing is not configured." }, 503);
  }

  const signature = request.headers.get("x-razorpay-signature")?.trim();
  const eventId = request.headers.get("x-razorpay-event-id")?.trim();
  const rawBody = await request.text();
  if (!signature || !eventId || eventId.length > 200 || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    return response({ ok: false, code: "SIGNATURE_INVALID", message: "Invalid webhook signature." }, 400);
  }

  const payload = await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => null);
  if (!isRecord(payload)) return response({ ok: false, code: "INVALID_PAYLOAD", message: "Invalid webhook payload." }, 400);

  const eventType = readString(payload, "event");
  if (!eventType || eventType.length > 100) return response({ ok: false, code: "INVALID_EVENT", message: "Invalid webhook event." }, 400);

  const paymentEntity = getEntity(payload, "payment");
  const orderEntity = getEntity(payload, "order");
  const paymentId = readString(paymentEntity, "id");
  const orderId = readString(paymentEntity, "order_id") ?? readString(orderEntity, "id");
  const receipt = readString(orderEntity, "receipt");
  const requestNumber = receipt && isRequestNumber(receipt) ? receipt : undefined;
  const paymentStatus = getWebhookStatus(eventType);

  try {
    if (orderId && paymentStatus) {
      const payment = await getRazorpayPaymentByOrderId(orderId);
      const webhookAmount = readAmount(paymentEntity);
      const webhookCurrency = readString(paymentEntity, "currency")?.toUpperCase();
      if (payment && ((webhookAmount !== undefined && webhookAmount !== toRazorpayAmountPaise(payment.totalAmount)) || (webhookCurrency && webhookCurrency !== payment.currency))) {
        console.error("razorpay_webhook_reconciliation_failed", { eventType, reason: "amount_or_currency_mismatch" });
        return response({ ok: false, code: "PAYMENT_RECONCILIATION_FAILED", message: "Webhook payment data did not match the payment record." }, 409);
      }
    }

    const event = await recordRazorpayWebhookEvent({
      providerEventId: eventId,
      eventType,
      requestNumber,
      orderId,
      paymentId,
      payload,
      ...(paymentStatus ? { paymentStatus } : {}),
      method: readString(paymentEntity, "method"),
    });
    return response({ ok: true, idempotent: event.duplicate });
  } catch {
    console.error("razorpay_webhook_processing_failed", { eventType, code: "WEBHOOK_PROCESSING_FAILED" });
    return response({ ok: false, code: "WEBHOOK_PROCESSING_FAILED", message: "Webhook processing failed." }, 502);
  }
}

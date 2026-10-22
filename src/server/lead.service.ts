import "server-only";

import { after } from "next/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { LeadApiRequest } from "@/lib/analytics/meta-events";
import { calculateGst } from "@/lib/gst";
import { generateRequestNumber } from "@/lib/request-number";
import {
  createPublicRequest,
  isRequestStorageSchemaMismatch,
  persistPublicRequestFallback,
  PublicRequestStorageError,
  type PublicRequestInput,
} from "@/server/repositories/requests.supabase.repository";
import { ServiceCatalogUnavailableError } from "@/server/services.datasource";
import { getServiceBySlug } from "@/server/services.service";
import { verifyHcaptchaToken } from "./captcha.service";
import { sendMetaLeadEvent } from "./meta-conversions.service";

type LeadRequestContext = {
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
};

type LeadServiceResult = {
  ok: boolean;
  eventId: string;
  message: string;
  requestNumber: string;
  checkoutUrl?: string;
  paymentAvailable: boolean;
  code?: string;
  metaDispatched: boolean;
};

type UnknownRecord = Record<string, unknown>;

export class LeadServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "LEAD_UNAVAILABLE") {
    super(message);
    this.name = "LeadServiceError";
    this.status = status;
    this.code = code;
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTrimmedString(record: UnknownRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicateRequestNumberError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code =
    typeof error === "object" && error !== null && typeof (error as Record<string, unknown>).code === "string"
      ? (error as Record<string, string>).code
      : "";
  return code === "23505" || message.includes("duplicate key") || message.includes("requests_request_number_key");
}

function isStructuredStorageError(error: unknown): error is { provider: string } {
  return typeof error === "object" && error !== null && typeof (error as Record<string, unknown>).provider === "string";
}

function normalizeIndianPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  const localDigits = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  const fullNumber = `+91${localDigits}`;
  const phoneNumber = parsePhoneNumberFromString(fullNumber, "IN");
  const startsLikeMobile = /^[6-9]\d{9}$/.test(localDigits);

  if (
    !phoneNumber ||
    phoneNumber.country !== "IN" ||
    !startsLikeMobile ||
    localDigits.length !== 10 ||
    !phoneNumber.isPossible() ||
    !phoneNumber.isValid()
  ) {
    throw new LeadServiceError("Please enter a valid 10-digit Indian mobile number.", 400, "INVALID_PHONE");
  }

  return phoneNumber.number;
}

export async function createLead(
  input: LeadApiRequest,
  context: LeadRequestContext
): Promise<LeadServiceResult> {
  const rawInput = input as unknown;
  if (!isRecord(rawInput) || !isRecord(rawInput.service) || !isRecord(rawInput.lead)) {
    throw new LeadServiceError("Invalid request details.", 400);
  }

  const serviceSlug = readTrimmedString(rawInput.service, "slug");
  if (!serviceSlug || serviceSlug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(serviceSlug)) {
    throw new LeadServiceError("Please select a valid service.", 400);
  }

  const name = readTrimmedString(rawInput.lead, "name");
  const email = readTrimmedString(rawInput.lead, "email");
  const notes = readTrimmedString(rawInput.lead, "notes");
  const phone = readTrimmedString(rawInput.lead, "phone");

  if (!name || name.length > 120) {
    throw new LeadServiceError("Please enter your name.", 400);
  }

  if (email && (email.length > 254 || !isValidEmail(email))) {
    throw new LeadServiceError("Enter a valid email address.", 400);
  }

  if (notes.length > 2000) {
    throw new LeadServiceError("Please keep your note under 2000 characters.", 400);
  }

  const totalStartedAt = Date.now();
  const normalizedPhone = normalizeIndianPhone(phone);
  const captchaStartedAt = Date.now();
  const hcaptchaResult = await verifyHcaptchaToken(input.hcaptchaToken, context.clientIpAddress);
  const captchaMs = Date.now() - captchaStartedAt;
  if (!hcaptchaResult.ok) {
    console.warn("lead_captcha_rejected", {
      eventId: input.eventId,
      captchaProvider: "hcaptcha",
      reason: hcaptchaResult.reason,
      errors: hcaptchaResult.errors,
    });
    const status = hcaptchaResult.reason === "not_configured" || hcaptchaResult.reason === "unavailable" ? 503 : 400;
    const message = hcaptchaResult.reason === "missing_token"
      ? "Please complete the security check."
      : "Security verification failed. Please try again.";
    throw new LeadServiceError(message, status, "CAPTCHA_REJECTED");
  }

  const serviceLookupStartedAt = Date.now();
  let service;
  try {
    service = await getServiceBySlug(serviceSlug);
  } catch (error) {
    if (error instanceof ServiceCatalogUnavailableError) {
      throw new LeadServiceError("The service catalog is temporarily unavailable. Please try again.", 503, "SERVICE_CATALOG_UNAVAILABLE");
    }
    throw error;
  }
  const serviceLookupMs = Date.now() - serviceLookupStartedAt;
  if (!service) {
    throw new LeadServiceError("This service is not available for public requests right now.", 400, "SERVICE_UNAVAILABLE");
  }

  const gst = calculateGst(service.price);
  let requestNumber = "";
  let stored = false;
  let storageProvider = "";
  let createdRequest: Awaited<ReturnType<typeof createPublicRequest>> | null = null;
  let storageMs = 0;
  let storageFailureCode = "PAYMENT_STORE_UNAVAILABLE";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    requestNumber = generateRequestNumber();

    const publicRequestInput: PublicRequestInput = {
      eventId: input.eventId,
      requestNumber,
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: service.title,
      category: service.category,
      customerName: name,
      phone: normalizedPhone,
      email,
      notes,
      baseAmount: gst.baseAmount,
      gstRate: gst.gstRate,
      gstAmount: gst.gstAmount,
      totalAmount: gst.totalAmount,
      pricingType: service.pricingType,
      currency: "INR",
      source: "website",
    };

    const storageStartedAt = Date.now();
    try {
      createdRequest = await createPublicRequest(publicRequestInput);
      storageMs = Date.now() - storageStartedAt;
      stored = true;
      storageProvider = createdRequest.storageProvider;
      break;
    } catch (error) {
      storageMs = Date.now() - storageStartedAt;
      if (isDuplicateRequestNumberError(error) && attempt < 2) continue;

      if (error instanceof PublicRequestStorageError && error.fallbackProvider) {
        const fallbackProvider = error.fallbackProvider;
        storageFailureCode = isRequestStorageSchemaMismatch(error)
          ? "PAYMENT_STORE_SCHEMA_MISMATCH"
          : "PAYMENT_STORE_UNAVAILABLE";
        after(async () => {
          const fallbackStartedAt = Date.now();
          try {
            await persistPublicRequestFallback(publicRequestInput, fallbackProvider);
            console.info("lead_fallback_storage_completed", {
              eventId: input.eventId,
              storageProvider: fallbackProvider,
              durationMs: Date.now() - fallbackStartedAt,
            });
          } catch {
            console.error("lead_fallback_storage_failed", {
              eventId: input.eventId,
              storageProvider: fallbackProvider,
              code: "FALLBACK_STORAGE_FAILED",
              durationMs: Date.now() - fallbackStartedAt,
            });
          }
        });
        storageProvider = `${fallbackProvider}_deferred`;
        stored = true;
        break;
      }

      if (!isStructuredStorageError(error)) {
        console.error("lead_storage_failed", {
          eventId: input.eventId,
          storageProvider: "unknown",
          requestNumber,
          serviceSlug: service.slug,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
      throw new LeadServiceError("Lead storage is temporarily unavailable.", 502, "PAYMENT_STORE_UNAVAILABLE");
    }
  }

  if (!stored) {
    throw new LeadServiceError("Unable to reserve a request number. Please try again.", 503, "REQUEST_NUMBER_UNAVAILABLE");
  }

  const tracking = isRecord(rawInput.tracking) ? rawInput.tracking : {};

  after(async () => {
    const metaStartedAt = Date.now();
    try {
      const metaResult = await sendMetaLeadEvent({
        eventId: input.eventId,
        eventSourceUrl: readTrimmedString(tracking, "eventSourceUrl") || undefined,
        clientIpAddress: context.clientIpAddress,
        clientUserAgent: context.clientUserAgent,
        fbp: context.fbp || readTrimmedString(tracking, "fbp") || undefined,
        fbc: context.fbc || readTrimmedString(tracking, "fbc") || undefined,
        lead: { name, phone: normalizedPhone, email },
        service: { id: service.id, slug: service.slug, title: service.title, category: service.category },
      });

      if (!metaResult.ok && !metaResult.skipped) {
        console.error("lead_meta_dispatch_failed", {
          eventId: input.eventId,
          status: metaResult.status ?? null,
          durationMs: Date.now() - metaStartedAt,
        });
      }
    } catch {
      console.error("lead_meta_dispatch_failed", {
        eventId: input.eventId,
        status: null,
        durationMs: Date.now() - metaStartedAt,
      });
    }
  });

  const paymentAvailable = Boolean(createdRequest?.paymentAvailable && createdRequest.checkoutToken);
  const checkoutUrl = paymentAvailable
    ? `/checkout/${encodeURIComponent(requestNumber)}?token=${encodeURIComponent(createdRequest!.checkoutToken!)}`
    : undefined;
  const responseCode = paymentAvailable
    ? undefined
    : createdRequest?.storageProvider === "supabase"
      ? "QUOTE_REQUIRED"
      : storageFailureCode;
  const message = paymentAvailable
    ? "Lead accepted."
    : responseCode === "QUOTE_REQUIRED"
      ? "Your request has been received. Our team will contact you after reviewing your request."
      : "Your request has been received, but online payment is temporarily unavailable. Our team will contact you.";

  console.info("lead_created", {
    eventId: input.eventId,
    requestNumber,
    storageProvider,
    hcaptchaStatus: "verified",
    paymentAvailable,
    captchaMs,
    serviceLookupMs,
    storageMs,
    checkoutTokenMs: createdRequest?.storageTiming?.checkoutTokenMs ?? null,
    supabaseInsertMs: createdRequest?.storageTiming?.supabaseInsertMs ?? null,
    leadTotalMs: Date.now() - totalStartedAt,
  });

  return {
    ok: true,
    eventId: input.eventId,
    message,
    requestNumber,
    checkoutUrl,
    paymentAvailable,
    ...(responseCode ? { code: responseCode } : {}),
    metaDispatched: false,
  };
}




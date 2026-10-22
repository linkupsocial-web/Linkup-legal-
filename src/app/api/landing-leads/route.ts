import { createHash } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { coerceMetaEventId } from "@/lib/analytics/meta-events";
import { getAdLandingPage, getAdLandingService } from "@/data/ad-landing-pages";
import { submitLandingLeadToGoogleSheet, LandingGoogleSheetsError } from "@/server/landing-google-sheets.service";
import { sendMetaLeadEvent } from "@/server/meta-conversions.service";
import { checkRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const MAX_FIELD_LENGTHS = {
  landingPage: 80,
  serviceSlug: 160,
  name: 120,
  phone: 20,
  email: 254,
  city: 120,
  requirement: 1_200,
  attribution: 256,
  tracking: 2_048,
  honeypot: 200,
};
const successfulLeadDedupe = new Map<string, number>();
const pendingLeadDedupe = new Set<string>();

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string, maxLength: number): string {
  const value = record[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readOptionalString(record: UnknownRecord, key: string, maxLength: number): string | undefined {
  return readString(record, key, maxLength) || undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function normalizeIndianPhone(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  const localDigits = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  const phoneNumber = parsePhoneNumberFromString(`+91${localDigits}`, "IN");
  const validMobile = /^[6-9]\d{9}$/.test(localDigits);

  return phoneNumber && phoneNumber.country === "IN" && validMobile && phoneNumber.isPossible() && phoneNumber.isValid()
    ? phoneNumber.number
    : null;
}

function getClientIpAddress(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined
  );
}

function getClientKey(request: NextRequest) {
  return getClientIpAddress(request) ?? "unknown";
}

function badRequest(eventId: string, message: string) {
  return NextResponse.json({ ok: false, eventId, message }, { status: 400, headers: noStore });
}

function wasRecentlySubmitted(dedupeKey: string) {
  const now = Date.now();
  const expiresAt = successfulLeadDedupe.get(dedupeKey);
  if (expiresAt && expiresAt > now) return true;

  if (expiresAt) successfulLeadDedupe.delete(dedupeKey);
  return false;
}

function rememberSuccessfulSubmission(dedupeKey: string) {
  const now = Date.now();
  if (successfulLeadDedupe.size >= 10_000) {
    for (const [key, expiresAt] of successfulLeadDedupe) {
      if (expiresAt <= now) successfulLeadDedupe.delete(key);
    }
    if (successfulLeadDedupe.size >= 10_000) successfulLeadDedupe.delete(successfulLeadDedupe.keys().next().value as string);
  }

  successfulLeadDedupe.set(dedupeKey, now + 10 * 60_000);
}

export async function POST(request: NextRequest) {
  const routeStartedAt = Date.now();
  const ipRateLimit = checkRateLimit({ key: `landing-lead:ip:${getClientKey(request)}`, limit: 6, windowMs: 60_000 });
  if (!ipRateLimit.allowed) {
    return NextResponse.json(
      { ok: false, eventId: coerceMetaEventId(undefined, "landing"), message: "Please wait before submitting another request." },
      { status: 429, headers: { ...noStore, "Retry-After": String(ipRateLimit.retryAfterSeconds) } }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest(coerceMetaEventId(undefined, "landing"), "Invalid request body.");
  }

  if (!isRecord(payload)) return badRequest(coerceMetaEventId(undefined, "landing"), "Invalid request details.");

  const eventId = coerceMetaEventId(readOptionalString(payload, "eventId", 200), "landing");
  if (readString(payload, "website", MAX_FIELD_LENGTHS.honeypot)) {
    return badRequest(eventId, "We could not submit your request. Please try again.");
  }

  const landingPage = getAdLandingPage(readString(payload, "landingPage", MAX_FIELD_LENGTHS.landingPage));
  if (!landingPage) return badRequest(eventId, "Please use a valid landing page.");

  const service = getAdLandingService(landingPage, readString(payload, "serviceSlug", MAX_FIELD_LENGTHS.serviceSlug));
  if (!service) return badRequest(eventId, "Please select a valid service.");

  const lead = isRecord(payload.lead) ? payload.lead : null;
  if (!lead) return badRequest(eventId, "Invalid contact details.");

  const name = readString(lead, "name", MAX_FIELD_LENGTHS.name);
  const email = readString(lead, "email", MAX_FIELD_LENGTHS.email).toLowerCase();
  const city = readString(lead, "city", MAX_FIELD_LENGTHS.city);
  const normalizedPhone = normalizeIndianPhone(readString(lead, "phone", MAX_FIELD_LENGTHS.phone));
  const requirement = readString(lead, "requirement", MAX_FIELD_LENGTHS.requirement);

  if (!name) return badRequest(eventId, "Enter your full name.");
  if (!normalizedPhone) return badRequest(eventId, "Enter a valid 10-digit Indian mobile number.");
  if (email && !isValidEmail(email)) return badRequest(eventId, "Enter a valid email address.");
  if (!city) return badRequest(eventId, "Enter your city.");

  const duplicateKey = createHash("sha256")
    .update(`${landingPage.slug}:${service.slug}:${normalizedPhone}`)
    .digest("hex");
  if (wasRecentlySubmitted(duplicateKey) || pendingLeadDedupe.has(duplicateKey)) {
    return NextResponse.json(
      { ok: false, eventId, message: "This request was recently submitted. Please wait for our expert to contact you." },
      { status: 409, headers: { ...noStore, "Retry-After": "600" } }
    );
  }
  pendingLeadDedupe.add(duplicateKey);

  const attribution = isRecord(payload.attribution) ? payload.attribution : {};
  const tracking = isRecord(payload.tracking) ? payload.tracking : {};
  const clientIpAddress = getClientIpAddress(request);
  const clientUserAgent = request.headers.get("user-agent")?.trim() || undefined;
  const eventSourceUrl = readOptionalString(tracking, "eventSourceUrl", MAX_FIELD_LENGTHS.tracking);
  const fbp = request.cookies.get("_fbp")?.value || readOptionalString(tracking, "fbp", MAX_FIELD_LENGTHS.tracking);
  const fbc = request.cookies.get("_fbc")?.value || readOptionalString(tracking, "fbc", MAX_FIELD_LENGTHS.tracking);

  try {
    await submitLandingLeadToGoogleSheet({
      timestamp: new Date().toISOString(),
      fullName: name,
      phone: normalizedPhone,
      email,
      city,
      selectedService: service.title,
      landingPage: landingPage.slug,
      leadSource: landingPage.tracking.source,
      utmSource: readString(attribution, "utm_source", MAX_FIELD_LENGTHS.attribution),
      utmMedium: readString(attribution, "utm_medium", MAX_FIELD_LENGTHS.attribution),
      utmCampaign: readString(attribution, "utm_campaign", MAX_FIELD_LENGTHS.attribution),
      utmContent: readString(attribution, "utm_content", MAX_FIELD_LENGTHS.attribution),
      utmTerm: readString(attribution, "utm_term", MAX_FIELD_LENGTHS.attribution),
      gclid: readString(attribution, "gclid", MAX_FIELD_LENGTHS.attribution),
      fbclid: readString(attribution, "fbclid", MAX_FIELD_LENGTHS.attribution),
      ...(requirement ? { requirement } : {}),
    });
  } catch (error) {
    pendingLeadDedupe.delete(duplicateKey);
    const message = error instanceof LandingGoogleSheetsError ? error.message : "We could not submit your request. Please try again.";
    console.error("landing_lead_sheet_submission_failed", {
      eventId,
      landingPage: landingPage.slug,
      serviceSlug: service.slug,
      durationMs: Date.now() - routeStartedAt,
    });
    return NextResponse.json({ ok: false, eventId, message }, { status: 502, headers: noStore });
  }

  pendingLeadDedupe.delete(duplicateKey);
  rememberSuccessfulSubmission(duplicateKey);

  after(async () => {
    try {
      const result = await sendMetaLeadEvent({
        eventId,
        eventSourceUrl,
        clientIpAddress,
        clientUserAgent,
        fbp,
        fbc,
        lead: { name, phone: normalizedPhone, email },
        service: { id: service.id, slug: service.slug, title: service.title, category: service.category },
      });
      if (!result.ok && !result.skipped) {
        console.error("landing_lead_meta_dispatch_failed", { eventId, landingPage: landingPage.slug, status: result.status ?? null });
      }
    } catch {
      console.error("landing_lead_meta_dispatch_failed", { eventId, landingPage: landingPage.slug, status: null });
    }
  });

  console.info("landing_lead_sheet_submission_succeeded", {
    eventId,
    landingPage: landingPage.slug,
    serviceSlug: service.slug,
    durationMs: Date.now() - routeStartedAt,
  });

  return NextResponse.json({ ok: true, eventId, message: "Your request has been received." }, { headers: noStore });
}

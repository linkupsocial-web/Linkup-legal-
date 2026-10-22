import { NextRequest, NextResponse } from "next/server";
import { coerceMetaEventId, type LeadApiRequest, type LeadApiResponse } from "@/lib/analytics/meta-events";
import { createLead, LeadServiceError } from "@/server/lead.service";
import { checkRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function extractClientIpAddress(request: NextRequest) {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0]?.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  const routeStartedAt = Date.now();
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
  const rateLimit = checkRateLimit({ key: `lead:${clientKey}`, limit: 8, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json<LeadApiResponse>(
      { ok: false, success: false, eventId: coerceMetaEventId(undefined, "lead"), message: "Please wait before submitting another request.", error: "Rate limited." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<LeadApiResponse>(
      {
        ok: false,
        success: false,
        eventId: coerceMetaEventId(undefined, "lead"),
        message: "Invalid request body.",
        error: "Invalid request body.",
      },
      { status: 400, headers: noStore }
    );
  }

  const input: Record<string, unknown> =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const eventId = coerceMetaEventId(typeof input.eventId === "string" ? input.eventId : undefined, "lead");
  const normalizedPayload: LeadApiRequest = {
    ...input,
    eventId,
  } as LeadApiRequest;

  try {
    const result = await createLead(normalizedPayload, {
      clientIpAddress: extractClientIpAddress(request),
      clientUserAgent: request.headers.get("user-agent")?.trim() || undefined,
      fbp: request.cookies.get("_fbp")?.value,
      fbc: request.cookies.get("_fbc")?.value,
    });

    console.info("lead_route_responded", {
      eventId: result.eventId,
      status: 200,
      routeResponseMs: Date.now() - routeStartedAt,
    });

    return NextResponse.json<LeadApiResponse>(
      {
        ok: true,
        success: true,
        eventId: result.eventId,
        message: result.message,
        requestNumber: result.requestNumber,
        checkoutUrl: result.checkoutUrl,
        paymentAvailable: result.paymentAvailable,
        code: result.code,
        metaDispatched: result.metaDispatched,
      },
      { headers: noStore }
    );
  } catch (error) {
    const status = error instanceof LeadServiceError ? error.status : 500;
    const message = error instanceof LeadServiceError ? error.message : "Failed to create lead.";
    const code = error instanceof LeadServiceError ? error.code : "LEAD_UNAVAILABLE";

    console.error("lead_route_failed", {
      eventId,
      status,
      code,
      routeResponseMs: Date.now() - routeStartedAt,
    });

    return NextResponse.json<LeadApiResponse>(
      {
        ok: false,
        success: false,
        eventId,
        message,
        code,
        error: message,
      },
      { status, headers: noStore }
    );
  }
}

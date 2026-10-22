import "server-only";

import { createHash } from "node:crypto";

const META_PIXEL_ID = process.env.META_PIXEL_ID?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const META_CONVERSIONS_API_TOKEN = process.env.META_CONVERSIONS_API_TOKEN?.trim() || "";
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION?.trim() || "v22.0";
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE?.trim() || "";
const MAX_RETRY_ATTEMPTS = 3;
const META_TIMEOUT_MS = 2_500;

type MetaLeadEventInput = {
  eventId: string;
  eventSourceUrl?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  lead: {
    name: string;
    phone: string;
    email?: string;
  };
  service: {
    id: string;
    slug: string;
    title: string;
    category: string;
  };
};

type MetaDispatchResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  message: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email?: string) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
}

function normalizePhone(phone?: string) {
  const normalized = phone?.replace(/\D/g, "");
  return normalized ? sha256(normalized) : undefined;
}

function normalizeNameParts(name: string) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = normalizedName.split(/\s+/).filter(Boolean);

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : undefined;

  return {
    fn: firstName ? sha256(firstName) : undefined,
    ln: lastName ? sha256(lastName) : undefined,
  };
}

function isRetriableStatus(status: number) {
  return status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUserData(input: MetaLeadEventInput) {
  const { fn, ln } = normalizeNameParts(input.lead.name);

  return {
    em: normalizeEmail(input.lead.email),
    ph: normalizePhone(input.lead.phone),
    fn,
    ln,
    client_ip_address: input.clientIpAddress,
    client_user_agent: input.clientUserAgent,
    fbp: input.fbp,
    fbc: input.fbc,
  };
}

function buildEndpointUrl() {
  return `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events`;
}

export async function sendMetaLeadEvent(input: MetaLeadEventInput): Promise<MetaDispatchResult> {
  if (!META_PIXEL_ID || !META_CONVERSIONS_API_TOKEN) {
    return {
      ok: false,
      skipped: true,
      message: "Meta Conversions API is not configured.",
    };
  }

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: buildUserData(input),
        custom_data: {
          content_name: input.service.title,
          content_category: input.service.category,
          content_ids: [input.service.id],
          content_type: "service",
          service_slug: input.service.slug,
        },
      },
    ],
    ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}),
  };

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
      const response = await (async () => {
        try {
          return await fetch(buildEndpointUrl(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...body,
              access_token: META_CONVERSIONS_API_TOKEN,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      })();

      if (response.ok) {
        console.info("meta_capi_lead_dispatched", {
          eventId: input.eventId,
          attempt,
          hasFbp: Boolean(input.fbp),
          hasFbc: Boolean(input.fbc),
          hasEmail: Boolean(input.lead.email),
          hasPhone: Boolean(input.lead.phone),
        });

        return {
          ok: true,
          status: response.status,
          message: "Meta CAPI lead sent.",
        };
      }

      if (!isRetriableStatus(response.status) || attempt === MAX_RETRY_ATTEMPTS) {
        console.error("meta_capi_lead_failed", {
          eventId: input.eventId,
          attempt,
          status: response.status,
        });

        return {
          ok: false,
          status: response.status,
          message: "Meta CAPI lead failed.",
        };
      }

      console.warn("meta_capi_lead_retrying", {
        eventId: input.eventId,
        attempt,
        status: response.status,
      });
    } catch {
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error("meta_capi_lead_exception", {
          eventId: input.eventId,
          attempt,
        });

        return {
          ok: false,
          message: "Meta CAPI lead dispatch failed.",
        };
      }

      console.warn("meta_capi_lead_exception_retrying", {
        eventId: input.eventId,
        attempt,
      });
    }

    await wait(250 * attempt * attempt);
  }

  return {
    ok: false,
    message: "Meta CAPI lead dispatch exhausted retries.",
  };
}

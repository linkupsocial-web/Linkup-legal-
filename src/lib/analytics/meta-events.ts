export const META_EVENT_NAMES = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Search: "Search",
  Contact: "Contact",
  Lead: "Lead",
} as const;

export type MetaEventName = (typeof META_EVENT_NAMES)[keyof typeof META_EVENT_NAMES];

export const META_CUSTOM_EVENT_NAMES = {
  BrowseServicesClick: "BrowseServicesClick",
  HowItWorksClick: "HowItWorksClick",
  ServiceCardClick: "ServiceCardClick",
} as const;

export type MetaCustomEventName = (typeof META_CUSTOM_EVENT_NAMES)[keyof typeof META_CUSTOM_EVENT_NAMES];

export type MetaEventPayloadValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[];

export type MetaEventPayload = Record<string, MetaEventPayloadValue>;

export type LeadApiRequest = {
  eventId: string;
  hcaptchaToken?: string;
  service: {
    id: string;
    slug: string;
    title: string;
    category: string;
  };
  lead: {
    name: string;
    phone: string;
    email: string;
    notes: string;
  };
  tracking: {
    fbp?: string;
    fbc?: string;
    eventSourceUrl?: string;
    pagePath?: string;
    referrer?: string;
  };
};

export type LeadApiResponse = {
  ok: boolean;
  success?: boolean;
  eventId: string;
  message: string;
  error?: string;
  requestNumber?: string;
  checkoutUrl?: string;
  paymentAvailable?: boolean;
  code?: string;
  metaDispatched?: boolean;
};

function randomSegment() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createMetaEventId(prefix = "meta") {
  const normalizedPrefix = prefix.replace(/[^a-z0-9_-]+/gi, "").toLowerCase() || "meta";
  return `${normalizedPrefix}_${Date.now()}_${randomSegment()}`;
}

export function coerceMetaEventId(value?: string | null, prefix?: string) {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length >= 8 && trimmed.length <= 200) {
    return trimmed;
  }

  return createMetaEventId(prefix);
}

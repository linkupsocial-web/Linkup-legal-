"use client";

import {
  META_EVENT_NAMES,
  type MetaCustomEventName,
  type MetaEventName,
  type MetaEventPayload,
} from "./meta-events";

declare global {
  interface Window {
    fbq?: FacebookPixel;
    _fbq?: FacebookPixel;
    __metaPixelInitialized?: string;
    __metaLastTrackedUrl?: string;
  }
}

type FacebookPixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
};

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
const META_PIXEL_SCRIPT_ID = "meta-pixel-script";
const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const FBP_COOKIE_NAME = "_fbp";
const FBC_COOKIE_NAME = "_fbc";
const FBC_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getCookieValue(name: string) {
  if (!isBrowser()) return undefined;

  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

function ensureMetaStub() {
  if (!isBrowser()) return;
  if (window.fbq) return;

  const fbq: FacebookPixel = function (...args: unknown[]) {
    if (typeof fbq.callMethod === "function") {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue = fbq.queue ?? [];
    fbq.queue.push(args);
  };

  if (!window._fbq) {
    window._fbq = fbq;
  }

  fbq.push = fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;

  if (document.getElementById(META_PIXEL_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = META_PIXEL_SCRIPT_ID;
  script.async = true;
  script.src = META_PIXEL_SCRIPT_SRC;

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }

  document.head.appendChild(script);
}

function withPageContext(payload?: MetaEventPayload): MetaEventPayload {
  if (!isBrowser()) return payload ?? {};

  return {
    page_path: `${window.location.pathname}${window.location.search}`,
    page_url: window.location.href,
    referrer: document.referrer || undefined,
    language: document.documentElement.lang || undefined,
    ...payload,
  };
}

function dispatchStandardMetaEvent(name: MetaEventName, payload?: MetaEventPayload, eventId?: string) {
  if (!META_PIXEL_ID || !isBrowser()) return;

  initMetaPixel();

  const eventPayload = withPageContext(payload);

  if (!window.fbq) return;

  if (name === META_EVENT_NAMES.PageView && !eventId) {
    window.fbq("track", name);
    return;
  }

  if (eventId) {
    window.fbq("track", name, eventPayload, { eventID: eventId });
    return;
  }

  window.fbq("track", name, eventPayload);
}

function dispatchCustomMetaEvent(name: MetaCustomEventName, payload?: MetaEventPayload) {
  if (!META_PIXEL_ID || !isBrowser()) return;

  initMetaPixel();

  if (!window.fbq) return;

  window.fbq("trackCustom", name, withPageContext(payload));
}

export function isMetaPixelEnabled() {
  return META_PIXEL_ID.length > 0;
}

export function getMetaPixelId() {
  return META_PIXEL_ID;
}

export function initMetaPixel() {
  if (!META_PIXEL_ID || !isBrowser()) return false;

  ensureMetaStub();

  if (window.__metaPixelInitialized === META_PIXEL_ID) {
    return true;
  }

  if (!window.fbq) return false;

  window.fbq("init", META_PIXEL_ID);
  window.__metaPixelInitialized = META_PIXEL_ID;
  return true;
}

export function getFbp() {
  return getCookieValue(FBP_COOKIE_NAME);
}

export function getFbc() {
  return getCookieValue(FBC_COOKIE_NAME);
}

function extractFbclid(search: string) {
  const params = new URLSearchParams(search);
  return params.get("fbclid")?.trim() || undefined;
}

function extractFbclidFromFbc(fbc?: string) {
  if (!fbc) return undefined;

  const match = /^fb\.1\.\d+\.(.+)$/.exec(fbc);
  return match?.[1];
}

export function ensureFbcFromFbclid(search = isBrowser() ? window.location.search : "") {
  if (!isBrowser()) return undefined;

  const fbclid = extractFbclid(search);

  if (!fbclid) {
    return getFbc();
  }

  const existingFbc = getFbc();
  if (extractFbclidFromFbc(existingFbc) === fbclid) {
    return existingFbc;
  }

  const nextFbc = `fb.1.${Date.now()}.${fbclid}`;
  setCookie(FBC_COOKIE_NAME, nextFbc, FBC_COOKIE_MAX_AGE_SECONDS);
  return nextFbc;
}

export function getBrowserLeadTrackingContext() {
  if (!isBrowser()) {
    return {
      fbp: undefined,
      fbc: undefined,
      eventSourceUrl: undefined,
      pagePath: undefined,
      referrer: undefined,
    };
  }

  const fbc = ensureFbcFromFbclid();

  return {
    fbp: getFbp(),
    fbc,
    eventSourceUrl: window.location.href,
    pagePath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
  };
}

export function trackPageView() {
  dispatchStandardMetaEvent(META_EVENT_NAMES.PageView);
}

export function trackViewContent(payload: MetaEventPayload) {
  dispatchStandardMetaEvent(META_EVENT_NAMES.ViewContent, payload);
}

export function trackSearch(payload: MetaEventPayload) {
  dispatchStandardMetaEvent(META_EVENT_NAMES.Search, payload);
}

export function trackContact(payload: MetaEventPayload) {
  dispatchStandardMetaEvent(META_EVENT_NAMES.Contact, payload);
}

export function trackLead(payload: MetaEventPayload, eventId: string) {
  dispatchStandardMetaEvent(META_EVENT_NAMES.Lead, payload, eventId);
}

export function trackCustomMetaEvent(name: MetaCustomEventName, payload: MetaEventPayload) {
  dispatchCustomMetaEvent(name, payload);
}

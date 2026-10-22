type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters?: AnalyticsPayload) => void;
    dataLayer?: unknown[][];
  }
}

export function trackLandingAnalyticsEvent(eventName: string, payload: AnalyticsPayload): void {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", eventName, payload);
    return;
  }

  // Google Analytics is deliberately loaded during browser idle time. Queue
  // events so high-intent users who submit quickly are still attributed when
  // the existing provider initialises gtag.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(["event", eventName, payload]);
}

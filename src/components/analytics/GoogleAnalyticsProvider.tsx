"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GOOGLE_ANALYTICS_IDLE_DELAY_MS = 5000;

export default function GoogleAnalyticsProvider({ measurementId }: { measurementId: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!measurementId) return;

    let idleId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      const load = () => setShouldLoad(true);

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(load, { timeout: 1500 });
        return;
      }

      load();
    }, GOOGLE_ANALYTICS_IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [measurementId]);

  if (!shouldLoad) return null;

  const serializedMeasurementId = JSON.stringify(measurementId);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${serializedMeasurementId});
        `}
      </Script>
    </>
  );
}

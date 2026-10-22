"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  ensureFbcFromFbclid,
  isMetaPixelEnabled,
  trackPageView,
} from "@/lib/analytics/meta-browser";

const META_PIXEL_IDLE_DELAY_MS = 5000;

export default function MetaPixelProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEnabled = isMetaPixelEnabled();

  const relativeUrl = useMemo(() => {
    const search = searchParams.toString();
    return `${pathname}${search ? `?${search}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isEnabled) return;

    let idleId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      const track = () => {
        ensureFbcFromFbclid();

        if (window.__metaLastTrackedUrl === relativeUrl) {
          return;
        }

        window.__metaLastTrackedUrl = relativeUrl;
        trackPageView();
      };

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(track, { timeout: 1500 });
        return;
      }

      track();
    }, META_PIXEL_IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [isEnabled, relativeUrl]);

  if (!isEnabled) return null;

  return null;
}

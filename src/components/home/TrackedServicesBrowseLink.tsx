"use client";

import Link, { type LinkProps } from "next/link";
import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { META_CUSTOM_EVENT_NAMES } from "@/lib/analytics/meta-events";
import { trackCustomMetaEvent } from "@/lib/analytics/meta-browser";

type TrackedServicesBrowseLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> &
  Omit<LinkProps, "href"> & {
    surface: string;
  };

const SERVICES_HREF = "/services";

const TrackedServicesBrowseLink = forwardRef<HTMLAnchorElement, TrackedServicesBrowseLinkProps>(
  function TrackedServicesBrowseLink({ surface, onClick, ...props }, ref) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      trackCustomMetaEvent(META_CUSTOM_EVENT_NAMES.BrowseServicesClick, {
        cta_name: "browse_services",
        surface,
        destination: SERVICES_HREF,
      });
    };

    return <Link ref={ref} href={SERVICES_HREF} onClick={handleClick} {...props} />;
  }
);

TrackedServicesBrowseLink.displayName = "TrackedServicesBrowseLink";

export default TrackedServicesBrowseLink;

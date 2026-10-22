import type { Metadata } from "next";
import AdLandingRoute, { getAdLandingMetadata } from "@/components/ad-landing/AdLandingRoute";

export const metadata: Metadata = getAdLandingMetadata("gst-registration");

export default function GstRegistrationPage() {
  return <AdLandingRoute slug="gst-registration" />;
}

import type { Metadata } from "next";
import AdLandingRoute, { getAdLandingMetadata } from "@/components/ad-landing/AdLandingRoute";

export const metadata: Metadata = getAdLandingMetadata("compliance");

export default function ComplianceLandingPage() {
  return <AdLandingRoute slug="compliance" />;
}

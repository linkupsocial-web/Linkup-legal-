import type { Metadata } from "next";
import AdLandingRoute, { getAdLandingMetadata } from "@/components/ad-landing/AdLandingRoute";

export const metadata: Metadata = getAdLandingMetadata("register-your-company");

export default function RegisterYourCompanyPage() {
  return <AdLandingRoute slug="register-your-company" />;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import type { AdLandingPageConfig } from "@/data/ad-landing-pages";
import { trackContact } from "@/lib/analytics/meta-browser";
import { CALL_NUMBER, CALL_NUMBER_HREF, WHATSAPP_NUMBER } from "@/lib/contact";
import { getWhatsAppSupportHref } from "@/lib/whatsapp-support";

export default function AdLandingHeader({ page }: { page: AdLandingPageConfig }) {
  const whatsappHref = getWhatsAppSupportHref(WHATSAPP_NUMBER, `I need help with ${page.serviceName}.`);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="h-0.5 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
      <div className="container flex h-16 items-center justify-between gap-3 py-2">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2" aria-label="LinkUp Legal home">
          <Image src="/logo.svg" alt="LinkUp Legal" width={40} height={40} priority className="h-10 w-10" />
          <span className="hidden text-base font-bold tracking-tight text-primary sm:block">LinkUp Legal</span>
        </Link>
        <div className="flex items-center gap-2">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackContact({
                  contact_channel: "whatsapp",
                  surface: "ad_landing_header",
                  destination: whatsappHref,
                  landing_page: page.tracking.landingPageId,
                  service_slug: page.formService.slug,
                })
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary/20 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          ) : null}
          {CALL_NUMBER_HREF ? (
            <a
              href={CALL_NUMBER_HREF}
              onClick={() =>
                trackContact({
                  contact_channel: "phone",
                  surface: "ad_landing_header",
                  destination: CALL_NUMBER_HREF,
                  landing_page: page.tracking.landingPageId,
                  service_slug: page.formService.slug,
                })
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Talk to an expert{CALL_NUMBER ? ` · ${CALL_NUMBER}` : ""}</span>
              <span className="sm:hidden">Call</span>
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

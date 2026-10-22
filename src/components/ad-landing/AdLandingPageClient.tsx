"use client";

import { CheckCircle2, Clock, MessageCircle, Phone } from "lucide-react";
import { useEffect } from "react";
import type { AdLandingPageConfig } from "@/data/ad-landing-pages";
import { trackContact, trackViewContent } from "@/lib/analytics/meta-browser";
import { trackLandingAnalyticsEvent } from "@/lib/analytics/landing-events";
import { CALL_NUMBER_HREF, WHATSAPP_NUMBER } from "@/lib/contact";
import { getWhatsAppSupportHref } from "@/lib/whatsapp-support";
import AdLandingFooter from "./AdLandingFooter";
import AdLandingHeader from "./AdLandingHeader";
import AdLandingQuoteForm from "./AdLandingQuoteForm";
import {
  ChecklistSection,
  ContentGridSection,
  FaqSection,
  ProcessSection,
  TestimonialsSection,
  TrustStrip,
} from "./AdLandingSections";

export default function AdLandingPageClient({ page }: { page: AdLandingPageConfig }) {
  const whatsappHref = getWhatsAppSupportHref(WHATSAPP_NUMBER, `I need help with ${page.serviceName}.`);

  const trackCta = (surface: string, channel: "phone" | "whatsapp" | "quote") => {
    const payload = {
      landing_page: page.tracking.landingPageId,
      service_slug: page.formService.slug,
      service_id: page.formService.id,
      surface,
      channel,
    };
    trackLandingAnalyticsEvent("landing_cta_click", payload);
  };

  const handlePhoneClick = (surface: string) => {
    trackCta(surface, "phone");
    trackContact({
      contact_channel: "phone",
      surface,
      destination: CALL_NUMBER_HREF || undefined,
      landing_page: page.tracking.landingPageId,
      service_slug: page.formService.slug,
    });
  };

  const handleWhatsappClick = (surface: string) => {
    trackCta(surface, "whatsapp");
    trackContact({
      contact_channel: "whatsapp",
      surface,
      destination: whatsappHref || undefined,
      landing_page: page.tracking.landingPageId,
      service_slug: page.formService.slug,
    });
  };

  const handleQuoteClick = (surface: string) => trackCta(surface, "quote");

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <LandingPageViewTracker page={page} />
      <AdLandingHeader page={page} />
      <main>
        <section className="overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(245,158,11,0.2),transparent_30%),linear-gradient(135deg,#0b2754_0%,#123f7b_58%,#10336b_100%)] py-10 text-white md:py-16">
          <div className="container grid items-start gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-12">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">{page.hero.eyebrow}</p>
              <h1 className="mt-4 font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{page.hero.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">{page.hero.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {page.hero.badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                    {badge}
                  </span>
                ))}
              </div>
              <ul className="mt-8 space-y-3">
                {page.hero.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-base leading-6 text-slate-100">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                    {highlight}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex max-w-2xl gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-sm leading-6 text-slate-100">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                <p>{page.hero.processingTime}</p>
              </div>
              {page.hero.registrationOptions ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {page.hero.registrationOptions.map((option) => (
                    <article
                      key={option.title}
                      className={`rounded-xl border p-4 ${option.featured ? "border-secondary bg-secondary/15" : "border-white/15 bg-white/5"}`}
                    >
                      <h2 className="font-heading font-bold text-white">{option.title}</h2>
                      <p className="mt-1 text-sm leading-5 text-slate-200">{option.description}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="order-first lg:order-none">
              <AdLandingQuoteForm page={page} />
            </div>
          </div>
        </section>

        <TrustStrip points={page.trustPoints} />
        <ProcessSection section={page.process} />
        <ContentGridSection section={page.benefits} tone="plain" />
        <ChecklistSection section={page.eligibility} tone="muted" />
        <ContentGridSection section={page.included} tone="accent" />
        <ChecklistSection section={page.documents} />
        <ContentGridSection section={page.deliverables} tone="muted" />
        <ContentGridSection section={page.whyLinkupLegal} tone="plain" />
        <TestimonialsSection testimonials={page.testimonials} />
        <FaqSection faqs={page.faqs} />
        <section className="bg-primary py-14 text-white md:py-20">
          <div className="container max-w-4xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{page.cta.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-200">{page.cta.description}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#quote-form"
                onClick={() => handleQuoteClick("ad_landing_final_cta")}
                className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-5 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/90"
              >
                {page.cta.primaryLabel}
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleWhatsappClick("ad_landing_final_cta")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  {page.cta.secondaryLabel}
                </a>
              ) : CALL_NUMBER_HREF ? (
                <a
                  href={CALL_NUMBER_HREF}
                  onClick={() => handlePhoneClick("ad_landing_final_cta")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  {page.cta.secondaryLabel}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <AdLandingFooter page={page} />
      <a
        href="#quote-form"
        onClick={() => handleQuoteClick("ad_landing_mobile_sticky_cta")}
        className="fixed inset-x-3 bottom-3 z-50 inline-flex h-12 items-center justify-center rounded-md bg-secondary px-4 text-sm font-bold text-secondary-foreground shadow-lg md:hidden"
      >
        {page.cta.stickyLabel}
      </a>
    </div>
  );
}

function LandingPageViewTracker({ page }: { page: AdLandingPageConfig }) {
  const trackingKey = `${page.tracking.landingPageId}:${page.formService.slug}`;

  useEffect(() => {
    const payload = {
      landing_page: page.tracking.landingPageId,
      service_slug: page.formService.slug,
      service_id: page.formService.id,
    };
    trackLandingAnalyticsEvent("landing_page_view", payload);
    trackViewContent({
      content_name: page.serviceName,
      content_category: page.formService.category,
      content_ids: [page.formService.id],
      content_type: "service",
      service_slug: page.formService.slug,
      surface: "ad_landing_page",
      landing_page: page.tracking.landingPageId,
    });
  }, [page, trackingKey]);

  return null;
}

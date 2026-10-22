"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, FileBadge, Phone, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { META_CUSTOM_EVENT_NAMES } from "@/lib/analytics/meta-events";
import { trackContact, trackCustomMetaEvent } from "@/lib/analytics/meta-browser";
import { CALL_NUMBER_HREF } from "@/lib/contact";
import StatsSection from "@/components/home/StatsSection";

export default function HeroSection() {
  const { t } = useLanguage();
  const trustBadges: Array<{ label: string; Icon: LucideIcon }> = [
    { label: t.hero.isoCertified, Icon: BadgeCheck },
    { label: t.hero.sslSecured, Icon: ShieldCheck },
    { label: t.hero.govtRecognized, Icon: Sparkles },
    { label: t.hero.dippRegistered, Icon: FileBadge },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]" />
        <div className="absolute -left-16 -top-20 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,153,51,0.14)_0%,rgba(255,153,51,0.07)_28%,transparent_72%)] blur-3xl" />
        <div className="absolute right-0 top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(19,136,8,0.12)_0%,rgba(19,136,8,0.06)_30%,transparent_74%)] blur-3xl" />
        <div className="absolute -right-16 -bottom-20 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(19,136,8,0.14)_0%,rgba(19,136,8,0.07)_28%,transparent_72%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9933]/35 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
      </div>

      <div className="container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm md:text-base">
            <span className="h-2 w-2 rounded-full bg-success" />
            {t.hero.badge}
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground md:text-6xl">
            {t.hero.titleStart} <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>
          {/* <p
            className="mt-6 text-lg leading-relaxed text-muted-foreground animate-fade-in md:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            {t.hero.description}
          </p> */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link
                href="/services"
                onClick={() =>
                  trackCustomMetaEvent(META_CUSTOM_EVENT_NAMES.BrowseServicesClick, {
                    cta_name: "browse_services",
                    surface: "home_hero",
                    destination: "/services",
                  })
                }
              >
                {t.hero.browseServices} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild disabled={!CALL_NUMBER_HREF}>
              <a
                href={CALL_NUMBER_HREF || "#"}
                onClick={() =>
                  trackContact({
                    contact_channel: "phone",
                    surface: "home_hero",
                    destination: CALL_NUMBER_HREF || undefined,
                  })
                }
              >
                <Phone className="mr-1 h-4 w-4" />
                {t.hero.callExpert}
              </a>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link
                href="/#how-it-works"
                onClick={() =>
                  trackCustomMetaEvent(META_CUSTOM_EVENT_NAMES.HowItWorksClick, {
                    cta_name: "how_it_works",
                    surface: "home_hero",
                    destination: "/#how-it-works",
                  })
                }
              >
                {t.hero.howItWorks}
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {trustBadges.map(({ label, Icon }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <StatsSection />
        </div>
      </div>
    </section>
  );
}

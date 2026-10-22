"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Headphones, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { META_CUSTOM_EVENT_NAMES } from "@/lib/analytics/meta-events";
import { trackCustomMetaEvent } from "@/lib/analytics/meta-browser";

const featureItems = [
  { icon: ShieldCheck, labelKey: "secure" },
  { icon: Clock3, labelKey: "fast" },
  { icon: Headphones, labelKey: "support" },
] as const;

export default function CtaSection() {
  const { t } = useLanguage();

  return (
    <section className="container py-14 md:py-20">
      <div
        className="relative overflow-hidden rounded-[2.5rem] border border-primary/15 bg-gradient-to-br from-primary via-primary to-primary/90 px-6 py-10 text-center shadow-[0_28px_90px_rgba(37,99,235,0.2)] sm:px-10 md:px-14 md:py-14"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6%] top-[-12%] h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-[-8%] bottom-[-18%] h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_40%)]" />
        </div>

        <div
          className="relative mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-primary-foreground/90 backdrop-blur-md"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <span>Trusted by 1000+ businesses</span>
        </div>

        <h2
          className="relative mx-auto mt-5 max-w-3xl text-3xl font-heading font-bold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl"
        >
          {t.cta.title}
        </h2>

        <p
          className="relative mx-auto mt-4 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg"
        >
          {t.cta.description}
        </p>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          {featureItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.labelKey}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-primary-foreground/90 shadow-sm backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-emerald-200" />
                <span>{t.cta[item.labelKey]}</span>
              </div>
            );
          })}
        </div>

        <div className="relative mt-8">
          <Button
            variant="hero-outline"
            size="lg"
            className="group border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground shadow-lg shadow-black/10 transition-transform duration-300 hover:bg-primary-foreground/20"
            asChild
          >
            <Link
              href="/services"
              onClick={() =>
                trackCustomMetaEvent(META_CUSTOM_EVENT_NAMES.BrowseServicesClick, {
                  cta_name: "browse_services",
                  surface: "home_cta_section",
                  destination: "/services",
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                {t.cta.button}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10"
        />
      </div>
    </section>
  );
}

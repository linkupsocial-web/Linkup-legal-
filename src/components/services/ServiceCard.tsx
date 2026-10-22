"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Shield } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ComboBadge from "@/components/services/ComboBadge";
import ServiceVisual from "@/components/services/ServiceVisual";
import { getServiceIcon } from "@/components/services/service-icons";
import { META_CUSTOM_EVENT_NAMES } from "@/lib/analytics/meta-events";
import { trackCustomMetaEvent } from "@/lib/analytics/meta-browser";
import { useLanguage } from "@/context/language-context";
import { translateStrings } from "@/i18n/auto-translate";
import type { ServiceCardItem } from "@/types/service";

export default function ServiceCard({
  service,
  surface = "services_grid",
}: {
  service: ServiceCardItem;
  surface?: string;
}) {
  const { language, t } = useLanguage();
  const [localizedService, setLocalizedService] = useState(service);
  const ServiceIcon = getServiceIcon(service.icon);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (language === "en") {
        setLocalizedService(service);
        return;
      }

      const [title, description, duration] = await translateStrings(language, [
        service.title,
        service.description,
        service.duration,
      ]);

      if (!isMounted) return;

      const next = {
        ...service,
        title,
        description,
        duration,
      };

      setLocalizedService((prev) => {
        if (
          prev.title === next.title &&
          prev.description === next.description &&
          prev.duration === next.duration
        ) {
          return prev;
        }

        return next;
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [language, service]);

  return (
    <Link
      href={`/services/${service.slug}`}
      prefetch={false}
      aria-label={`View details for ${localizedService.title}`}
      onClick={() =>
        trackCustomMetaEvent(META_CUSTOM_EVENT_NAMES.ServiceCardClick, {
          content_name: service.title,
          content_category: service.category,
          content_ids: [service.id],
          content_type: "service",
          service_slug: service.slug,
          surface,
          trigger: "card_click",
        })
      }
      className="block h-full"
    >
      <div className="group relative h-full overflow-hidden rounded-[1.5rem] p-[1.5px] transition-all duration-500 hover:-translate-y-2">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-blue-500 via-sky-500 to-emerald-400 opacity-0 shadow-[0_24px_50px_-24px_rgba(37,99,235,0.55)] transition-opacity duration-500 group-hover:opacity-100"
        />
        <Card className="relative flex h-full flex-col overflow-hidden rounded-[inherit] border-0 bg-card shadow-card transition-all duration-500 group-hover:shadow-2xl">
          <div className="relative h-44 overflow-hidden rounded-t-[1.5rem] bg-gradient-to-b from-sky-50 via-white to-amber-50 sm:h-48 md:h-52">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_34%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/90 to-transparent" />

            <div className="absolute left-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/95 text-blue-600 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <ServiceIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </div>

            {service.popular ? (
              <div className="absolute right-4 top-4 z-20">
                <ComboBadge label={t.serviceDetail.popular} variant="popular" />
              </div>
            ) : null}

            <div className="relative h-full w-full">
              <ServiceVisual
                title={localizedService.title}
                image={service.image}
                icon={service.icon}
                size="hero"
                className="bg-transparent"
              />
            </div>

            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/95 px-3 py-1.5 text-emerald-700 shadow-lg backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold">{t.serviceDetail.verifiedService}</span>
            </div>

          </div>

          <CardHeader className="pb-3 pt-5">
            <CardTitle className="line-clamp-2 text-xl text-slate-900 transition-colors duration-300 group-hover:text-blue-700">
              {localizedService.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2 leading-relaxed text-slate-600">
              {localizedService.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 pb-2">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-2 transition-colors duration-300 group-hover:border-emerald-300">
              <div className="relative flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
                    {t.serviceDetail.processingTime}
                  </div>
                  <div className="text-sm font-bold text-emerald-700">{localizedService.duration}</div>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0 pb-6">
            <div className="flex w-full items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">{t.serviceDetail.openServiceDetails}</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Link>
  );
}

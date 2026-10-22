"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import TrackedServicesBrowseLink from "@/components/home/TrackedServicesBrowseLink";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { getServiceIcon } from "@/components/services/service-icons";
import { translateStrings } from "@/i18n/auto-translate";
import type { ServiceCategorySummary } from "@/lib/service-categories";

type PopularServicesSectionProps = {
  categories: ServiceCategorySummary[];
};

export default function PopularServicesSection({ categories }: PopularServicesSectionProps) {
  const { language, t } = useLanguage();
  const [localizedCategories, setLocalizedCategories] = useState(categories);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (language === "en") {
        setLocalizedCategories(categories);
        return;
      }

      const translatedValues = await translateStrings(
        language,
        categories.flatMap((category) => [category.title, category.description])
      );

      if (!isMounted) return;

      setLocalizedCategories(
        categories.map((category, index) => ({
          ...category,
          title: translatedValues[index * 2] ?? category.title,
          description: translatedValues[index * 2 + 1] ?? category.description,
        }))
      );
    })();

    return () => {
      isMounted = false;
    };
  }, [categories, language]);

  return (
    <section className="container py-16 md:py-20">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground">{t.popularServices.title}</h2>
          <p className="mt-2 text-muted-foreground">{t.popularServices.description}</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <TrackedServicesBrowseLink surface="home_popular_services_header">
            {t.popularServices.viewAll} <ArrowRight className="ml-1 h-4 w-4" />
          </TrackedServicesBrowseLink>
        </Button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {localizedCategories.map((category) => (
          <CategoryCard key={category.slug} category={category} t={t} />
        ))}
      </div>
      <div className="mt-8 text-center sm:hidden">
        <Button variant="outline" asChild>
          <TrackedServicesBrowseLink surface="home_popular_services_footer">
            {t.popularServices.viewAllMobile}
          </TrackedServicesBrowseLink>
        </Button>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  t,
}: {
  category: ServiceCategorySummary;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const Icon = getServiceIcon(category.icon);

  return (
    <Link
      href={`/services/category/${category.slug}`}
      prefetch={false}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-4"
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-[0_18px_42px_-30px_rgba(15,23,42,0.5)] group-focus-visible:border-slate-400">
        <CardHeader className="pb-3">
          <span
            aria-hidden="true"
            className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          >
            <Icon className="h-6 w-6" />
          </span>
          <CardTitle className="text-xl text-slate-950 transition-colors duration-200 group-hover:text-slate-800">
            {category.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{category.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4 pt-0">
          <span className="text-sm font-medium text-slate-600">
            {category.count} {category.count === 1 ? t.popularServices.service : t.popularServices.services}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

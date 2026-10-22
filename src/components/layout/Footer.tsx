"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/language-context";

const footerColumns = [
  {
    titleKey: "services",
    links: [
      { href: "/services", labelKey: "registration" },
      { href: "/services", labelKey: "licenses" },
      { href: "/services", labelKey: "taxAndFiling" },
      { href: "/services", labelKey: "allServices" },
    ],
  },
  {
    titleKey: "company",
    links: [
      { href: "/", labelKey: "aboutUs" },
      { href: "/", labelKey: "careers" },
      { href: "/", labelKey: "blog" },
      { href: "/", labelKey: "contact" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { href: "/privacy-policy", labelKey: "privacyPolicy" },
      { href: "/", labelKey: "termsOfService" },
      { href: "/", labelKey: "refundPolicy" },
    ],
  },
] as const;

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative overflow-hidden border-t border-border/80 bg-gradient-to-b from-card via-background to-muted/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-[-12%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-8%] bottom-[-16%] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
      </div>

      <div className="container relative py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr]">
          <div className="max-w-xl">
            <Link href="/" className="inline-flex items-center gap-3">
              {/* <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                <Image
                  src="/logo.svg"
                  alt="Linkup Legal"
                  width={28}
                  height={28}
                  sizes="28px"
                  loading="lazy"
                  className="h-7 w-7 object-contain"
                />
              </span> */}
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Linkup Legal"
                  width={42}
                  height={42}
                  sizes="42px"
                  priority
                  className="h-10 w-10 object-contain"
                />
              </div>
              <span className="text-xl font-heading font-extrabold tracking-tight text-primary">
                Linkup Legal
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              {t.footer.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>{t.hero.sslSecured}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                <span>{t.hero.isoCertified}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>{t.hero.govtRecognized}</span>
              </div>
            </div>
          </div>

          {footerColumns.map((column) => (
            <div
              key={column.titleKey}
              className="rounded-3xl border border-border/70 bg-background/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm"
            >
              <h3 className="font-heading text-base font-semibold text-foreground">
                {t.footer[column.titleKey]}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 transition-colors hover:text-foreground"
                    >
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                      <span>{t.footer[link.labelKey]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/70 pt-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Linkup Legal. {t.footer.rights}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {t.footer.secureCompliance}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.footer.expertSupport}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              {t.footer.indiaWideServices}
            </span>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>
    </footer>
  );
}

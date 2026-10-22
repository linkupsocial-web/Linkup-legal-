"use client";

import { CheckCircle2, ShieldCheck, Shield, Users, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/context/language-context";

type TrustCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
};

export default function TrustSection() {
  const { t } = useLanguage();

  const trustItems: TrustCard[] = [
    {
      title: t.trust.secureTitle,
      description: t.trust.secureDescription,
      icon: Shield,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: t.trust.govtTitle,
      description: t.trust.govtDescription,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: t.trust.expertsTitle,
      description: t.trust.expertsDescription,
      icon: Users,
      gradient: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <section
      id="trust"
      className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 py-6 md:py-10"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.75),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.16),transparent_34%)]" />
      <div className="container relative">
        <div
          className="w-full rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8 md:p-10"
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 shadow-[0_14px_24px_rgba(34,197,94,0.28)] transition-transform duration-300 hover:-rotate-2 hover:scale-105 motion-reduce:transition-none sm:h-20 sm:w-20">
              <ShieldCheck className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>

            <h2 className="text-3xl font-heading font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {t.trust.title}
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              {t.trust.description}
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)] motion-reduce:transition-none sm:p-6"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]`} />

                  <div className="relative flex items-start gap-5">
                    <div
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-[0_12px_20px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none`}
                    >
                      <span
                        className="absolute inset-[-8px] rounded-[1rem] bg-white/50 opacity-0 blur-md group-hover:opacity-100"
                      />
                      <Icon className="relative z-10 h-7 w-7 text-white" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-heading font-semibold tracking-tight text-slate-900 sm:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-900/5">
                    <div
                      className={`h-full origin-left scale-x-0 rounded-full bg-gradient-to-r opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-x-100 group-hover:opacity-100 motion-reduce:transition-none ${item.gradient}`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

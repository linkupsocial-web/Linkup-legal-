import { CheckCircle2, FileCheck2, Quote, ShieldCheck } from "lucide-react";
import type { AdLandingPageConfig } from "@/data/ad-landing-pages";

type ContentSection = AdLandingPageConfig["benefits"];

export function TrustStrip({ points }: { points: string[] }) {
  return (
    <div className="border-y border-slate-200 bg-white">
      <div className="container grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {points.map((point) => (
          <div key={point} className="flex items-center justify-center gap-2 px-4 py-3 text-center text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProcessSection({ section }: { section: AdLandingPageConfig["process"] }) {
  return (
    <section className="bg-slate-950 py-14 text-white md:py-20">
      <div className="container">
        <SectionHeading section={section} dark />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {section.items.map((item, index) => (
            <article key={item.title} className="rounded-xl border border-white/15 bg-white/5 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-heading text-sm font-bold text-secondary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-5 font-heading text-lg font-bold">{item.title}</h3>
              {item.description ? <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContentGridSection({
  section,
  tone = "plain",
}: {
  section: ContentSection;
  tone?: "plain" | "muted" | "accent";
}) {
  const background = tone === "muted" ? "bg-slate-50" : tone === "accent" ? "bg-primary/[0.04]" : "bg-white";

  return (
    <section className={`${background} py-14 md:py-20`}>
      <div className="container">
        <SectionHeading section={section} />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {section.items.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="mt-4 font-heading text-base font-bold text-slate-950">{item.title}</h3>
              {item.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChecklistSection({ section, tone = "plain" }: { section: ContentSection; tone?: "plain" | "muted" }) {
  const background = tone === "muted" ? "bg-slate-50" : "bg-white";

  return (
    <section className={`${background} py-14 md:py-20`}>
      <div className="container max-w-5xl">
        <SectionHeading section={section} align="center" />
        <div className="mt-9 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2">
          {section.items.map((item) => (
            <div key={item.title} className="flex gap-3 border-b border-slate-200 p-5 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0 sm:[&:nth-child(odd)]:border-r">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: AdLandingPageConfig["testimonials"] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-slate-50 py-14 md:py-20">
      <div className="container max-w-5xl">
        <div className="grid gap-5 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Quote className="h-8 w-8 text-secondary" />
              <blockquote className="mt-4 text-lg leading-8 text-slate-700">“{testimonial.text}”</blockquote>
              <footer className="mt-5">
                <p className="font-heading font-bold text-slate-950">{testimonial.name}</p>
                <p className="mt-1 text-sm text-slate-500">{testimonial.context}</p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: AdLandingPageConfig["faqs"] }) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="container max-w-4xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Frequently asked questions</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Clear answers before you request a quote.</p>
        </div>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="cursor-pointer list-none py-4 pr-8 font-heading text-base font-bold text-slate-900 marker:hidden">
                {faq.question}
                <span className="float-right ml-4 text-xl font-normal text-primary transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="pb-5 pr-8 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  section,
  dark = false,
  align = "left",
}: {
  section: Pick<ContentSection, "eyebrow" | "title" | "description">;
  dark?: boolean;
  align?: "left" | "center";
}) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  const titleColor = dark ? "text-white" : "text-slate-950";
  const descriptionColor = dark ? "text-slate-300" : "text-slate-600";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      {section.eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">{section.eyebrow}</p> : null}
      <h2 className={`mt-3 font-heading text-3xl font-bold tracking-tight md:text-4xl ${titleColor}`}>{section.title}</h2>
      {section.description ? <p className={`mt-4 text-base leading-7 ${descriptionColor}`}>{section.description}</p> : null}
    </div>
  );
}

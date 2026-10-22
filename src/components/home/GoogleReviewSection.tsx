"use client";

import { useEffect, useMemo, useState } from "react";
import { Quote, Star } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { translateStrings } from "@/i18n/auto-translate";

type Review = { name: string; time: string; rating: number; text: string };

const reviews: Review[] = [
  { name: "Vikas Ahire", time: "1 year ago", rating: 5, text: "I used Linkup Legal for GST filing and the experience was very smooth. The team explained everything clearly and completed the work on time without any hassle." },
  { name: "Dinesh Panhale", time: "1 year ago", rating: 5, text: "Very professional service. I had multiple doubts regarding registration, and their team guided me patiently at every step. Highly recommended for anyone starting a business." },
  { name: "Ziyauddin Patel", time: "1 year ago", rating: 5, text: "Quick response and transparent pricing. There were no hidden charges and the process was handled efficiently from start to finish." },
  { name: "Rohit Sharma", time: "8 months ago", rating: 5, text: "Great experience overall. The team is knowledgeable and communicates clearly. Made the entire process stress-free." },
  { name: "Priya Verma", time: "6 months ago", rating: 5, text: "Very reliable service. I received regular updates and didn't have to follow up again and again. That made a big difference." },
];

const AUTO_SLIDE_INTERVAL_MS = 5000;

const reviewThemes = [
  {
    ring: "from-sky-500 via-blue-500 to-indigo-500",
    inner: "from-sky-50 via-white to-white",
    text: "from-sky-700 via-blue-700 to-indigo-700",
    aura: "from-sky-400/30 via-blue-500/15 to-transparent",
    status: "bg-emerald-400",
  },
  {
    ring: "from-violet-500 via-purple-500 to-fuchsia-500",
    inner: "from-violet-50 via-white to-white",
    text: "from-violet-700 via-purple-700 to-fuchsia-700",
    aura: "from-violet-400/30 via-purple-500/15 to-transparent",
    status: "bg-emerald-400",
  },
  {
    ring: "from-emerald-500 via-teal-500 to-cyan-500",
    inner: "from-emerald-50 via-white to-white",
    text: "from-emerald-700 via-teal-700 to-cyan-700",
    aura: "from-emerald-400/30 via-teal-500/15 to-transparent",
    status: "bg-emerald-400",
  },
  {
    ring: "from-orange-500 via-amber-500 to-rose-500",
    inner: "from-orange-50 via-white to-white",
    text: "from-orange-700 via-amber-700 to-rose-700",
    aura: "from-orange-400/30 via-amber-500/15 to-transparent",
    status: "bg-emerald-400",
  },
  {
    ring: "from-pink-500 via-rose-500 to-red-500",
    inner: "from-pink-50 via-white to-white",
    text: "from-pink-700 via-rose-700 to-red-700",
    aura: "from-pink-400/30 via-rose-500/15 to-transparent",
    status: "bg-emerald-400",
  },
] as const;

const GoogleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.195 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.171 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.174 0-9.62-3.326-11.284-7.946l-6.522 5.025C9.505 39.556 16.719 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C37.016 39.187 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
  </svg>
);

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

export default function GoogleReviewSection() {
  const { language, t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeReview, setActiveReview] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [localizedReviews, setLocalizedReviews] = useState(reviews);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (language === "en") {
        setLocalizedReviews(reviews);
        return;
      }

      const translatedTimes = await translateStrings(language, reviews.map((review) => review.time));
      const translatedTexts = await translateStrings(language, reviews.map((review) => review.text));

      if (!isMounted) return;

      const nextReviews = reviews.map((review, index) => ({
        ...review,
        time: translatedTimes[index],
        text: translatedTexts[index],
      }));

      setLocalizedReviews((prev) => {
        const unchanged =
          prev.length === nextReviews.length &&
          prev.every((review, index) => review.time === nextReviews[index].time && review.text === nextReviews[index].text);
        return unchanged ? prev : nextReviews;
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [language]);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveReview((current) => (current === localizedReviews.length - 1 ? 0 : current + 1));
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, localizedReviews.length, prefersReducedMotion]);

  const review = localizedReviews[activeReview] ?? localizedReviews[0];
  const theme = reviewThemes[activeReview % reviewThemes.length];
  const initials = useMemo(() => getInitials(review?.name ?? ""), [review?.name]);

  return (
    <section className="border-y bg-card">
      <div className="container relative py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <GoogleIcon className="h-4 w-4" />
            <span>{t.reviews.badge}</span>
          </div>
          <h2 className="mt-5 text-3xl font-heading font-bold tracking-tight text-slate-900 md:text-4xl">
            {t.reviews.title}
          </h2>
          <p className="mt-3 text-muted-foreground">{t.reviews.subtitle}</p>
        </div>

        <div
          className="relative mx-auto mt-10 max-w-4xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm md:p-5">
            <article className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none md:p-8">
              <div className={`absolute -right-6 -top-6 h-40 w-40 rounded-full bg-gradient-to-br ${theme.aura} blur-3xl`} />
              <Quote className="absolute right-4 top-4 h-24 w-24 text-slate-900/5 md:h-32 md:w-32" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full bg-gradient-to-br ${theme.ring} p-[3px] shadow-[0_16px_30px_rgba(15,23,42,0.14)]`}>
                    <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${theme.inner}`}>
                      <span className={`bg-gradient-to-r ${theme.text} bg-clip-text text-lg font-semibold text-transparent`}>
                        {initials}
                      </span>
                      <span className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${theme.status}`} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xl font-heading font-semibold tracking-tight text-slate-900">{review.name}</p>
                    <p className="text-sm text-slate-500">{review.time}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
                    <GoogleIcon className="h-4 w-4" />
                    <span>{t.reviews.reviewLabel}</span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    <span>{t.reviews.ratingLabel}</span>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const filled = index < review.rating;
                    return (
                      <span key={`${review.name}-star-${index}`}>
                        <Star
                          className={`h-5 w-5 ${filled ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                        />
                      </span>
                    );
                  })}
                </div>
                <span className="ml-2 text-sm text-slate-500">{review.time}</span>
              </div>

              <p className="relative mt-6 max-w-3xl text-lg leading-8 text-slate-700">
                {review.text}
              </p>

              <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <span>{t.reviews.verifiedLabel}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>
            </article>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {localizedReviews.map((item, index) => {
                const isActive = index === activeReview;

                return (
                  <button
                    key={`${item.name}-dot`}
                    type="button"
                    onClick={() => setActiveReview(index)}
                    aria-label={`${t.reviews.goToReview} ${index + 1}`}
                    className="inline-flex h-6 w-8 items-center justify-center rounded-full transition-colors duration-300 motion-reduce:transition-none"
                  >
                    <span
                      className={`h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                        isActive ? "w-8 bg-slate-900" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

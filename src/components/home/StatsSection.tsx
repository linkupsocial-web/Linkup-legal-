"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/language-context";

type Stat = {
  value: number;
  suffix: string;
  label: string;
};

function useCountUp(duration = 1400) {
  const ref = useRef<HTMLDivElement | null>(null);
  const hasRun = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      hasRun.current = true;
      setProgress(1);
      return;
    }

    const run = () => {
      if (hasRun.current) return;

      hasRun.current = true;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setProgress(eased);

        if (elapsed < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        run();
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [duration]);

  return { ref, progress };
}

export default function StatsSection() {
  const { t } = useLanguage();
  const stats: Stat[] = [
    { value: 1500, suffix: "+", label: t.stats.requestsCompleted },
    { value: 50, suffix: "+", label: t.stats.verifiedExperts },
    { value: 99, suffix: "%", label: t.stats.successRate },
    { value: 24, suffix: "hr", label: t.stats.avgResponse },
  ];
  const { ref, progress } = useCountUp();

  return (
    <div
      ref={ref}
      className="mt-4 flex flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-3 md:text-base"
    >
      {stats.map((stat, index) => (
        <span key={stat.label} className="inline-flex items-baseline gap-1.5">
          <span className="font-heading text-base font-semibold text-foreground md:text-lg">
            {Math.round(stat.value * progress)}
            {stat.suffix}
          </span>
          <span>{stat.label}</span>
          {index < stats.length - 1 ? (
            <span className="hidden text-border sm:inline" aria-hidden="true">
              |
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

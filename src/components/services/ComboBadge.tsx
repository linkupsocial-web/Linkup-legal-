"use client";

import { cn } from "@/lib/utils";

type ComboBadgeProps = {
  label: string;
  variant?: "combo" | "popular";
  className?: string;
};

const variantStyles = {
  combo: {
    body: "bg-[linear-gradient(180deg,#ef4444_0%,#dc2626_50%,#b91c1c_100%)] shadow-[0_12px_18px_-14px_rgba(127,29,29,0.95)]",
    top: "bg-red-300/65",
    tip: "border-t-[#b91c1c]",
    side: "bg-[#991b1b]",
  },
  popular: {
    body: "bg-[linear-gradient(180deg,#fb923c_0%,#f97316_50%,#ea580c_100%)] shadow-[0_12px_18px_-14px_rgba(154,52,18,0.95)]",
    top: "bg-orange-200/75",
    tip: "border-t-[#ea580c]",
    side: "bg-[#c2410c]",
  },
};

export default function ComboBadge({ label, variant = "combo", className }: ComboBadgeProps) {
  if (variant === "popular") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border-0 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg transition-colors duration-300 hover:from-yellow-500 hover:to-orange-600 animate-pulse [animation-duration:3s]",
          className
        )}
      >
        ⭐ {label}
      </span>
    );
  }

  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "relative inline-flex min-w-[4.75rem] flex-col items-center justify-start px-3 pb-3 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-md",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-[calc(100%-0.8rem)] rounded-b-[4px]", styles.body)}
      />
      <span
        aria-hidden="true"
        className={cn("absolute left-1/2 top-0 h-1.5 w-[82%] -translate-x-1/2 rounded-b-full", styles.top)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[2.35rem] border-r-[2.35rem] border-t-[0.85rem] border-l-transparent border-r-transparent",
          styles.tip
        )}
      />
      <span
        aria-hidden="true"
        className={cn("absolute left-0 top-[0.15rem] h-1.5 w-2 -translate-x-[0.35rem] skew-y-[20deg] rounded-l-sm", styles.side)}
      />
      <span
        aria-hidden="true"
        className={cn("absolute right-0 top-[0.15rem] h-1.5 w-2 translate-x-[0.35rem] -skew-y-[20deg] rounded-r-sm", styles.side)}
      />
      <span className="relative z-10 leading-none">
        {label}
      </span>
    </span>
  );
}

"use client";

import { getServiceIcon } from "@/components/services/service-icons";

type NavbarSuggestionIconProps = {
  icon?: string | null;
};

export default function NavbarSuggestionIcon({ icon }: NavbarSuggestionIconProps) {
  const Icon = getServiceIcon(icon ?? "");

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

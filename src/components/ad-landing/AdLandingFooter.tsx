import Image from "next/image";
import Link from "next/link";
import type { AdLandingPageConfig } from "@/data/ad-landing-pages";

export default function AdLandingFooter({ page }: { page: AdLandingPageConfig }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="container grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="LinkUp Legal" width={36} height={36} className="h-9 w-9" />
            <span className="font-heading text-lg font-bold text-white">LinkUp Legal</span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{page.footer.disclaimer}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/privacy-policy" className="text-slate-300 transition-colors hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/" className="text-slate-300 transition-colors hover:text-white">
            LinkUp Legal Home
          </Link>
        </div>
      </div>
    </footer>
  );
}

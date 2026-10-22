import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default function LandingThankYou() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(245,158,11,0.26),transparent_28%),radial-gradient(circle_at_85%_85%,rgba(255,255,255,0.1),transparent_26%)]" />
      <section className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white px-8 py-10 shadow-[0_24px_70px_rgba(4,24,58,0.34)] sm:px-12 sm:py-12">
        <Image src="/logo.svg" alt="LinkUp Legal" width={52} height={52} priority className="mx-auto h-14 w-14" />
        <span className="mx-auto mt-7 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary shadow-sm">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-primary sm:text-4xl">Thank You</h1>
        <p className="mt-3 text-base font-medium text-slate-600">Your request is received.</p>
      </section>
    </main>
  );
}

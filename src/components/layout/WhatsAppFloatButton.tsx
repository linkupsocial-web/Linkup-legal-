"use client";

import { trackContact } from "@/lib/analytics/meta-browser";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { getWhatsAppSupportHref } from "@/lib/whatsapp-support";

const DEFAULT_MESSAGE = "Hello, I want to know more about your services.";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-7 w-7 fill-current", className)}>
      <path d="M19.11 17.38c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.13-.42-2.15-1.34-.79-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.41.12-.54.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.53-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.57 1.09 2.75.13.18 1.88 2.87 4.55 4.03.64.27 1.14.44 1.53.56.64.2 1.22.17 1.68.1.51-.08 1.58-.64 1.8-1.26.22-.62.22-1.15.16-1.26-.07-.11-.24-.18-.51-.31Z" />
      <path d="M16 3.2c-7.08 0-12.8 5.7-12.8 12.73 0 2.25.6 4.45 1.73 6.38L3.2 28.8l6.68-1.74a12.82 12.82 0 0 0 6.12 1.56h.01c7.07 0 12.79-5.7 12.79-12.73S23.07 3.2 16 3.2Zm0 23.27h-.01a10.67 10.67 0 0 1-5.44-1.49l-.39-.23-3.96 1.03 1.06-3.84-.25-.4a10.53 10.53 0 0 1-1.63-5.65c0-5.82 4.76-10.56 10.62-10.56 2.84 0 5.52 1.1 7.52 3.09a10.45 10.45 0 0 1 3.12 7.47c0 5.83-4.76 10.58-10.64 10.58Z" />
    </svg>
  );
}

export default function WhatsAppFloatButton() {
  if (!WHATSAPP_NUMBER) return null;

  const href = getWhatsAppSupportHref(WHATSAPP_NUMBER, DEFAULT_MESSAGE);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackContact({
          contact_channel: "whatsapp",
          surface: "floating_whatsapp_button",
          destination: href,
        })
      }
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_35px_-18px_rgba(37,211,102,0.9)] ring-4 ring-white/90 transition-transform duration-200 hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 md:bottom-6 md:right-6"
    >
      <WhatsAppGlyph />
    </a>
  );
}

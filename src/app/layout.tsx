// import type { Metadata, Viewport } from "next";
// import { DM_Sans, Space_Grotesk } from "next/font/google";
// import Script from "next/script";
// import { Suspense } from "react";
// import GoogleAnalyticsProvider from "@/components/analytics/GoogleAnalyticsProvider";
// import MetaPixelProvider from "@/components/analytics/MetaPixelProvider";
// import { LanguageProvider } from "@/context/language-context";
// import { getSiteUrl } from "@/lib/site-url";
// import "./globals.css";
// const siteUrl = getSiteUrl();
// const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID;
// const whatsappWidgetSrc = process.env.NEXT_PUBLIC_WHATSAPP_WIDGET_SRC;
// const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

// const headingFont = Space_Grotesk({
//   subsets: ["latin"],
//   variable: "--font-heading",
//   display: "swap",
// });

// const bodyFont = DM_Sans({
//   subsets: ["latin"],
//   variable: "--font-body",
//   display: "swap",
// });

// export const metadata: Metadata = {
//   ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
//   title: {
//     default: "Legal & Government Services in India | Linkup Legal",
//     template: "%s | Linkup Legal",
//   },
//   description:
//     "Find trusted legal and government services in India for GST, company registration, licenses, tax filing, and compliance with expert support.",
//   keywords: [
//     "legal services in India",
//     "government services in India",
//     "GST registration",
//     "GST filing",
//     "company registration",
//     "business compliance",
//     "tax filing services",
//     "license services",
//     "trademark registration",
//   ],
//   alternates: {
//     canonical: "/",
//   },
//   openGraph: {
//     title: "Legal & Government Services in India | Linkup Legal",
//     description:
//       "Explore expert-assisted GST, company registration, licenses, tax, and compliance services across India.",
//     ...(siteUrl ? { url: siteUrl } : {}),
//     siteName: "Linkup Legal",
//     locale: "en_IN",
//     type: "website",
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: "India Legal Services Platform | Linkup Legal",
//     description:
//       "Fast, affordable legal and government services in India with expert support from start to finish.",
//   },
//   robots: {
//     index: true,
//     follow: true,
//     googleBot: {
//       index: true,
//       follow: true,
//       "max-snippet": -1,
//       "max-image-preview": "large",
//       "max-video-preview": -1,
//     },
//   },
//   icons: {
//     icon: [
//       { url: "/icon.svg", type: "image/svg+xml" },
//       { url: "/favicon.ico", type: "image/x-icon" },
//     ],
//     shortcut: "/icon.svg",
//     apple: "/icon.svg",
//   },
// };

// //ll

// export const viewport: Viewport = {
//   themeColor: "#10336b", // hsl(221 72% 28%)
//   width: "device-width",
//   initialScale: 1,
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body className={`${headingFont.variable} ${bodyFont.variable} font-body antialiased`}>
//         <LanguageProvider>
//           {children}
//         </LanguageProvider>
//         <Suspense fallback={null}>
//           <MetaPixelProvider />
//         </Suspense>
//         {metaPixelId ? (
//           <noscript>
//             {/* eslint-disable-next-line @next/next/no-img-element */}
//             <img
//               height="1"
//               width="1"
//               style={{ display: "none" }}
//               loading="lazy"
//               src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
//               alt=""
//             />
//           </noscript>
//         ) : null}
//         {googleAnalyticsId ? <GoogleAnalyticsProvider measurementId={googleAnalyticsId} /> : null}
//         {whatsappWidgetSrc ? <Script src={whatsappWidgetSrc} strategy="lazyOnload" /> : null}
//       </body>
//     </html>
//   );
// }



import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalyticsProvider from "@/components/analytics/GoogleAnalyticsProvider";
import MetaPixelProvider from "@/components/analytics/MetaPixelProvider";
import { LanguageProvider } from "@/context/language-context";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID;
const whatsappWidgetSrc = process.env.NEXT_PUBLIC_WHATSAPP_WIDGET_SRC;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

// Google Tag Manager
const googleTagManagerId = "GTM-KS4BFTG3";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Legal & Government Services in India | Linkup Legal",
    template: "%s | Linkup Legal",
  },
  description:
    "Find trusted legal and government services in India for GST, company registration, licenses, tax filing, and compliance with expert support.",
  keywords: [
    "legal services in India",
    "government services in India",
    "GST registration",
    "GST filing",
    "company registration",
    "business compliance",
    "tax filing services",
    "license services",
    "trademark registration",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Legal & Government Services in India | Linkup Legal",
    description:
      "Explore expert-assisted GST, company registration, licenses, tax, and compliance services across India.",
    ...(siteUrl ? { url: siteUrl } : {}),
    siteName: "Linkup Legal",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "India Legal Services Platform | Linkup Legal",
    description:
      "Fast, affordable legal and government services in India with expert support from start to finish.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#10336b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} font-body antialiased`}
      >
        {/* ========================================
            GOOGLE TAG MANAGER - NOSCRIPT
            Immediately after opening <body>
        ======================================== */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
            height="0"
            width="0"
            style={{
              display: "none",
              visibility: "hidden",
            }}
            title="Google Tag Manager"
          />
        </noscript>

        {/* ========================================
            GOOGLE TAG MANAGER
            beforeInteractive = injected into <head>
        ======================================== */}
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({
                'gtm.start': new Date().getTime(),
                event:'gtm.js'
              });
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),
              dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${googleTagManagerId}');
          `}
        </Script>

        <LanguageProvider>
          {children}
        </LanguageProvider>

        <Suspense fallback={null}>
          <MetaPixelProvider />
        </Suspense>

        {metaPixelId ? (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              loading="lazy"
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(
                metaPixelId
              )}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        ) : null}

        {googleAnalyticsId ? (
          <GoogleAnalyticsProvider measurementId={googleAnalyticsId} />
        ) : null}

        {whatsappWidgetSrc ? (
          <Script src={whatsappWidgetSrc} strategy="lazyOnload" />
        ) : null}
      </body>
    </html>
  );
}
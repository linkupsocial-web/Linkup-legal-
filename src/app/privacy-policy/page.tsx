import type { Metadata } from "next";
import Layout from "@/components/layout/Layout";
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_LAST_UPDATED_DATE,
  LINKUP_LEGAL_ADDRESS,
  privacyPolicySections,
} from "@/data/privacy-policy";
import { CALL_NUMBER, CALL_NUMBER_HREF, CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const pageDescription =
  "Learn how Linkup Legal collects, uses, protects, and handles personal information from website enquiries, communications, services, and payments.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: pageDescription,
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | Linkup Legal",
    description: pageDescription,
    ...(siteUrl ? { url: toAbsoluteUrl("/privacy-policy") } : {}),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Linkup Legal",
    description: pageDescription,
  },
};

const linkClassName =
  "font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function PrivacyAndGrievanceContact() {
  return (
    <section className="border-t border-border pt-8 sm:pt-10" aria-labelledby="privacy-grievance-contact">
      <h2 id="privacy-grievance-contact" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        17. Privacy and Grievance Contact
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
        <p>For privacy requests or grievances, contact Linkup Legal using the details below.</p>
        <address className="space-y-1 not-italic">
          <p>
            <span className="font-semibold text-foreground">Company:</span> Linkup Group Pvt Ltd
          </p>
          <p>
            <span className="font-semibold text-foreground">Entity:</span> Linkup Legal
          </p>
          {CONTACT_EMAIL ? (
            <p>
              <span className="font-semibold text-foreground">Email:</span>{" "}
              <a className={`${linkClassName} break-all`} href={CONTACT_EMAIL_HREF}>
                {CONTACT_EMAIL}
              </a>
            </p>
          ) : null}
          {CALL_NUMBER ? (
            <p>
              <span className="font-semibold text-foreground">Telephone:</span>{" "}
              <a className={linkClassName} href={CALL_NUMBER_HREF}>
                {CALL_NUMBER}
              </a>
            </p>
          ) : null}
          <p>
            <span className="font-semibold text-foreground">Address:</span> {LINKUP_LEGAL_ADDRESS}
          </p>
          {siteUrl ? (
            <p>
              <span className="font-semibold text-foreground">Website:</span>{" "}
              <a className={`${linkClassName} break-all`} href={siteUrl}>
                {siteUrl}
              </a>
            </p>
          ) : null}
        </address>
      </div>
    </section>
  );
}

function ContactUs() {
  return (
    <section className="border-t border-border pt-8 sm:pt-10" aria-labelledby="contact-us">
      <h2 id="contact-us" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        19. Contact Us
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
        <address className="space-y-1 not-italic">
          <p className="font-medium text-foreground">Linkup Legal</p>
          {CONTACT_EMAIL ? (
            <p>
              <a className={`${linkClassName} break-all`} href={CONTACT_EMAIL_HREF}>
                {CONTACT_EMAIL}
              </a>
            </p>
          ) : null}
          {CALL_NUMBER ? (
            <p>
              <a className={linkClassName} href={CALL_NUMBER_HREF}>
                {CALL_NUMBER}
              </a>
            </p>
          ) : null}
          <p>{LINKUP_LEGAL_ADDRESS}</p>
          {siteUrl ? (
            <p>
              <a className={`${linkClassName} break-all`} href={siteUrl}>
                {siteUrl}
              </a>
            </p>
          ) : null}
        </address>
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <section className="container py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <header className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Legal</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Privacy Policy</h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              How Linkup Legal collects, uses, protects, and handles personal information through its website,
              enquiries, communications, services, and payments.
            </p>
          </header>

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-5 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Effective Date:</span> {PRIVACY_POLICY_EFFECTIVE_DATE}
            </p>
            <p>
              <span className="font-semibold text-foreground">Last Updated:</span> {PRIVACY_POLICY_LAST_UPDATED_DATE}
            </p>
          </div>

          <article className="mt-8">
            <section className="border-b border-border pb-8 sm:pb-10" aria-labelledby="privacy-introduction">
              <h2 id="privacy-introduction" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Introduction
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                Linkup Legal respects your privacy. This Privacy Policy explains how we collect, use, disclose,
                retain, and protect personal information when you use our website, contact us, submit an enquiry,
                request a service, or communicate with us.
              </p>
            </section>

            <div>
              {privacyPolicySections.map((section) => (
                <section
                  key={section.number}
                  className="border-b border-border py-8 sm:py-10"
                  aria-labelledby={`privacy-section-${section.number}`}
                >
                  <h2
                    id={`privacy-section-${section.number}`}
                    className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                  >
                    {section.number}. {section.heading}
                  </h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets ? (
                      <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            <PrivacyAndGrievanceContact />

            <section className="border-t border-border pt-8 sm:pt-10" aria-labelledby="privacy-policy-changes">
              <h2 id="privacy-policy-changes" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                18. Changes to This Privacy Policy
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                We may update this Privacy Policy to reflect service, business, technology, legal, regulatory, or
                advertising-platform changes. The revised version will be posted on this page with an updated effective
                date and last updated date.
              </p>
            </section>

            <ContactUs />
          </article>
        </div>
      </section>
    </Layout>
  );
}

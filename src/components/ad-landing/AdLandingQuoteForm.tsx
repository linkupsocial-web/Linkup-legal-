"use client";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { getAdLandingService, getAdLandingServices, type AdLandingPageConfig } from "@/data/ad-landing-pages";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMetaEventId } from "@/lib/analytics/meta-events";
import { getBrowserLeadTrackingContext, trackLead } from "@/lib/analytics/meta-browser";
import { trackLandingAnalyticsEvent } from "@/lib/analytics/landing-events";
import { captureLandingAttribution, type LandingAttribution } from "@/lib/landing-attribution";

type FormData = {
  name: string;
  phone: string;
  email: string;
  city: string;
  requirement: string;
};

type FormErrors = Partial<Record<keyof FormData | "service", string>>;

type LandingLeadApiResponse = {
  ok: boolean;
  eventId: string;
  message: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

function validateAndNormalizeIndianPhone(rawPhone: string): { isValid: boolean; normalized: string } {
  const digits = rawPhone.replace(/\D/g, "");
  const fullNumber = `+91${digits}`;
  const phoneNumber = parsePhoneNumberFromString(fullNumber, "IN");
  const startsLikeMobile = /^[6-9]\d{9}$/.test(digits);
  const isValid = Boolean(
    phoneNumber &&
      phoneNumber.country === "IN" &&
      startsLikeMobile &&
      digits.length === 10 &&
      phoneNumber.isPossible() &&
      phoneNumber.isValid()
  );

  return { isValid, normalized: phoneNumber?.number ?? fullNumber };
}

export default function AdLandingQuoteForm({ page }: { page: AdLandingPageConfig }) {
  const router = useRouter();
  const submitInFlightRef = useRef(false);
  const formStartedRef = useRef(false);
  const attributionRef = useRef<LandingAttribution>({});
  const availableServices = getAdLandingServices(page);
  const [formData, setFormData] = useState<FormData>({ name: "", phone: "", email: "", city: "", requirement: "" });
  const [serviceSlug, setServiceSlug] = useState(() =>
    page.serviceField.type === "fixed" ? page.serviceField.service.slug : ""
  );
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    attributionRef.current = captureLandingAttribution(window.location.search);
  }, [page.tracking.landingPageId]);

  const trackFormStart = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackLandingAnalyticsEvent("lead_form_start", {
      landing_page: page.tracking.landingPageId,
      service_slug: page.formService.slug,
      service_id: page.formService.id,
    });
  };

  const update = (field: keyof FormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  };

  const updateService = (value: string) => {
    setServiceSlug(value);
    setErrors((current) => ({ ...current, service: undefined }));
    setSubmitError("");
  };

  const validate = (): { errors: FormErrors; normalizedPhone: string } => {
    const nextErrors: FormErrors = {};
    const phone = validateAndNormalizeIndianPhone(formData.phone);

    if (!formData.name.trim()) nextErrors.name = "Enter your full name.";
    if (!phone.isValid) nextErrors.phone = "Enter a valid 10-digit Indian mobile number.";
    if (formData.email.trim() && !isValidEmail(formData.email)) nextErrors.email = "Enter a valid email address.";
    if (!formData.city.trim()) nextErrors.city = "Enter your city.";
    if (!getAdLandingService(page, serviceSlug)) nextErrors.service = "Select a valid service.";

    return { errors: nextErrors, normalizedPhone: phone.normalized };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackFormStart();

    const validation = validate();
    if (Object.keys(validation.errors).length > 0) {
      setErrors(validation.errors);
      return;
    }

    const selectedService = getAdLandingService(page, serviceSlug);
    if (!selectedService || submitInFlightRef.current || isSubmitting) return;

    const eventId = createMetaEventId("lead");
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/landing-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          landingPage: page.slug,
          serviceSlug: selectedService.slug,
          lead: {
            name: formData.name.trim(),
            phone: validation.normalizedPhone,
            email: formData.email.trim(),
            city: formData.city.trim(),
            requirement: formData.requirement.trim(),
          },
          attribution: attributionRef.current,
          tracking: getBrowserLeadTrackingContext(),
          website: honeypot,
        }),
      });
      const payload = (await response.json().catch(() => null)) as LandingLeadApiResponse | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "We could not submit your request. Please try again.");
      }

      const analyticsPayload = {
        landing_page: page.tracking.landingPageId,
        service_slug: selectedService.slug,
        service_id: selectedService.id,
      };
      trackLead(
        {
          content_name: selectedService.title,
          content_category: selectedService.category,
          content_ids: [selectedService.id],
          content_type: "service",
          service_slug: selectedService.slug,
          surface: "ad_landing_quote_form",
          landing_page: page.tracking.landingPageId,
        },
        payload.eventId
      );
      trackLandingAnalyticsEvent("lead_form_submit", analyticsPayload);
      trackLandingAnalyticsEvent("lead_form_success", analyticsPayload);
      router.push("/thank-you");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not submit your request. Please try again.";
      console.error("ad_landing_lead_submit_failed", { landingPage: page.tracking.landingPageId, error: message });
      setSubmitError(message);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section id="quote-form" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-950">{page.form.heading}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">{page.form.subheading}</p>
        </div>
      </div>

      <form className="relative mt-5 space-y-4" noValidate onSubmit={handleSubmit} onFocus={trackFormStart}>
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>
        <fieldset disabled={isSubmitting} className="space-y-4">
          <Field label="Full Name" error={errors.name} inputId="name">
            <Input id="name" value={formData.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} placeholder="Your full name" className="text-slate-900 placeholder:text-slate-400" />
          </Field>
          <Field label="Mobile Number" error={errors.phone} inputId="phone">
            <div className={`flex h-10 items-center rounded-md border bg-background ${errors.phone ? "border-destructive" : "border-input"}`}>
              <span className="flex h-full items-center border-r px-3 text-sm text-muted-foreground">+91</span>
              <Input id="phone" value={formData.phone} onChange={(event) => update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} autoComplete="tel-national" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} className="h-full border-0 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0" placeholder="9876543210" />
            </div>
          </Field>
          <Field label="Email Address" error={errors.email} inputId="email">
            <Input id="email" type="email" value={formData.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} placeholder="you@example.com (optional)" className="text-slate-900 placeholder:text-slate-400" />
          </Field>
          <Field label="City" error={errors.city} inputId="city">
            <Input id="city" value={formData.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "city-error" : undefined} placeholder="Your city" className="text-slate-900 placeholder:text-slate-400" />
          </Field>
          <Field label={page.form.serviceLabel} error={errors.service} inputId="service">
            {page.serviceField.type === "select" ? (
              <select id="service" value={serviceSlug} onChange={(event) => updateService(event.target.value)} required aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? "service-error" : undefined} className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${errors.service ? "border-destructive" : "border-input"}`}>
                <option value="" disabled className="bg-white text-slate-500">{page.serviceField.placeholder}</option>
                {availableServices.map((service) => <option key={service.slug} value={service.slug} className="bg-white text-slate-900">{service.title}</option>)}
              </select>
            ) : (
              <Input id="service" value={page.serviceField.service.value} readOnly aria-readonly className="cursor-default bg-slate-50 text-slate-700" />
            )}
          </Field>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="requirement">{page.form.requirementLabel}</label>
            <Textarea id="requirement" value={formData.requirement} onChange={(event) => update("requirement", event.target.value.slice(0, 1200))} placeholder={page.form.requirementPlaceholder} rows={3} className="text-slate-900 placeholder:text-slate-400" />
          </div>
          {submitError ? <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{submitError}</p> : null}
          <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:pointer-events-none disabled:opacity-60">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? page.form.submittingLabel : page.form.submitLabel}
          </button>
        </fieldset>
      </form>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">{page.form.privacyText}</p>
    </section>
  );
}

function Field({ label, error, inputId, children }: { label: string; error?: string; inputId: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor={inputId}>{label}</label>
      {children}
      {error ? <p id={`${inputId}-error`} className="mt-1.5 text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}

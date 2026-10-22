"use client";

import HCaptcha, { HCaptcha as HCaptchaInstance } from "@hcaptcha/react-hcaptcha";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import ServiceVisual from "@/components/services/ServiceVisual";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Clock, FileText, Phone, Users } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { createMetaEventId, type LeadApiRequest, type LeadApiResponse } from "@/lib/analytics/meta-events";
import {
  getBrowserLeadTrackingContext,
  trackContact,
  trackLead,
  trackViewContent,
} from "@/lib/analytics/meta-browser";
import { CALL_NUMBER_HREF } from "@/lib/contact";
import { isSafeInternalCheckoutUrl } from "@/lib/checkout-url";
import type { Service } from "@/types/service";
import { useLanguage } from "@/context/language-context";
import { translateStrings } from "@/i18n/auto-translate";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

function validateAndNormalizeIndianPhone(localDigits: string): { isValid: boolean; normalized: string } {
  const digits = localDigits.replace(/\D/g, "");
  const fullNumber = `+91${digits}`;
  const phoneNumber = parsePhoneNumberFromString(fullNumber, "IN");
  const startsLikeMobile = /^[6-9]\d{9}$/.test(digits);

  if (!phoneNumber) return { isValid: false, normalized: fullNumber };

  const isValid =
    phoneNumber.country === "IN" &&
    startsLikeMobile &&
    digits.length === 10 &&
    phoneNumber.isPossible() &&
    phoneNumber.isValid();

  return { isValid, normalized: phoneNumber.number };
}

export default function ServiceDetailClient({
  service,
  hcaptchaSiteKey,
}: {
  service: Service;
  hcaptchaSiteKey: string;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isComingSoon = service.status === "coming-soon";
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [formErrors, setFormErrors] = useState<{ phone?: string; email?: string }>({});
  const [hcaptchaToken, setHcaptchaToken] = useState("");
  const [localizedService, setLocalizedService] = useState(service);
  const trackedServiceSlugRef = useRef("");
  const submitInFlightRef = useRef(false);
  const hcaptchaRef = useRef<HCaptchaInstance>(null);

  const phoneCheck = validateAndNormalizeIndianPhone(formData.phone);
  const hasValidEmail = !formData.email.trim() || isValidEmail(formData.email);
  const hasValidFormFields = Boolean(formData.name.trim()) && phoneCheck.isValid && hasValidEmail;
  const canSubmit = !isComingSoon && !isSubmitting && hasValidFormFields && Boolean(hcaptchaToken);

  const resetHcaptcha = () => {
    setHcaptchaToken("");
    hcaptchaRef.current?.resetCaptcha();
  };

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (language === "en") {
        setLocalizedService(service);
        return;
      }

      const baseStrings = [service.title, service.description, service.duration];
      const translatedBase = await translateStrings(language, baseStrings);
      const translatedFeatures = await translateStrings(language, service.features);
      const translatedDocs = await translateStrings(language, service.requiredDocuments);

      if (!isMounted) return;

      const next = {
        ...service,
        title: translatedBase[0],
        description: translatedBase[1],
        duration: translatedBase[2],
        features: translatedFeatures,
        requiredDocuments: translatedDocs,
      };

      setLocalizedService((prev) => {
        const sameFeatures =
          prev.features.length === next.features.length &&
          prev.features.every((feature, index) => feature === next.features[index]);
        const sameDocs =
          prev.requiredDocuments.length === next.requiredDocuments.length &&
          prev.requiredDocuments.every((doc, index) => doc === next.requiredDocuments[index]);

        if (
          prev.title === next.title &&
          prev.description === next.description &&
          prev.duration === next.duration &&
          sameFeatures &&
          sameDocs
        ) {
          return prev;
        }

        return next;
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [language, service]);

  useEffect(() => {
    if (trackedServiceSlugRef.current === service.slug) return;

    trackedServiceSlugRef.current = service.slug;
    trackViewContent({
      content_name: service.title,
      content_category: service.category,
      content_ids: [service.id],
      content_type: "service",
      service_slug: service.slug,
      surface: "service_detail_page",
      customers_served: service.customersServed,
    });
  }, [service]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isComingSoon) {
      toast({
        title: t.serviceDetail.comingSoon,
        description: t.serviceDetail.comingSoonNotice,
      });
      return;
    }

    const nextErrors: { phone?: string; email?: string } = {};

    if (!phoneCheck.isValid) {
      nextErrors.phone = "Please enter a valid 10-digit Indian mobile number.";
    }

    if (formData.email.trim() && !isValidEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address (for example: name@example.com).";
    }

    if (nextErrors.phone || nextErrors.email) {
      setFormErrors(nextErrors);
      toast({
        title: "Please correct the highlighted fields.",
        description: nextErrors.phone ?? nextErrors.email,
      });
      return;
    }

    if (submitInFlightRef.current || isSubmitting) return;

    if (!hcaptchaToken) {
      toast({ title: "Please complete the security check." });
      return;
    }

    const eventId = createMetaEventId("lead");
    submitInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      setFormErrors({});
      const normalizedPhone = phoneCheck.normalized;
      const tracking = getBrowserLeadTrackingContext();

      const requestBody: LeadApiRequest = {
        eventId,
        hcaptchaToken,
        service: {
          id: service.id,
          slug: service.slug,
          title: service.title,
          category: service.category,
        },
        lead: {
          name: formData.name.trim(),
          phone: normalizedPhone,
          email: formData.email.trim(),
          notes: formData.notes.trim(),
        },
        tracking,
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as LeadApiResponse | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload?.message || "Failed to submit your request.");
      }

      trackLead(
        {
          content_name: service.title,
          content_category: service.category,
          content_ids: [service.id],
          content_type: "service",
          service_slug: service.slug,
          surface: "service_request_form",
        },
        payload.eventId
      );

      if (payload.paymentAvailable && isSafeInternalCheckoutUrl(payload.checkoutUrl, window.location.origin)) {
        setFormSubmitted(true);
        toast({ title: t.serviceDetail.requestSubmitted, description: t.serviceDetail.openingSecureCheckout });
        router.push(payload.checkoutUrl);
        return;
      }

      if (payload.paymentAvailable) {
        throw new Error("Secure checkout is temporarily unavailable. Please try again.");
      }

      setFormSubmitted(true);
      toast({ title: t.serviceDetail.requestSubmitted, description: payload.message || t.serviceDetail.requestReceived });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit your request.";
      console.error("lead_submit_request_failed", {
        eventId,
        error: message,
      });
      toast({
        title: "Request could not be submitted.",
        description: message,
      });
    } finally {
      resetHcaptcha();
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const update = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="container py-8 md:py-12">
      <Toaster />
      <Link
        href="/services"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground animate-fade-in"
        style={{ animationDelay: "0.05s" }}
      >
        <ArrowLeft className="h-4 w-4" /> {t.serviceDetail.backToServices}
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="mb-4 flex items-start gap-3">
              <ServiceVisual
                title={localizedService.title}
                image={localizedService.image}
                icon={localizedService.icon}
                size="lg"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-heading font-bold text-foreground">{localizedService.title}</h1>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">{localizedService.description}</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {/*
              <div className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5">
                <IndianRupee className="h-4 w-4 text-accent-foreground" />
                <span className="font-semibold text-foreground">
                  {String(localizedService.price).trim() === "0" || String(localizedService.price).trim() === ""
                    ? t.serviceDetail.freeConsultation
                    : `₹${String(localizedService.price).trim()}`}
                </span>
              </div>
              */}
              <div className="relative overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-r from-sky-50 via-white to-blue-100 px-4 py-2.5">
                <div className="relative flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-blue-500">
                      Duration
                    </div>
                    <span className="font-semibold text-blue-700">{localizedService.duration}</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-lime-100 px-4 py-2.5">
                <div className="relative flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-500">
                      Customers served
                    </div>
                    <span className="font-semibold text-emerald-700">
                      {localizedService.customersServed.toLocaleString()}+ {t.serviceDetail.customersServed}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">{t.serviceDetail.whatsIncluded}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {localizedService.features.length > 0 ? (
                  localizedService.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Service inclusions will be confirmed by the assigned expert.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Required Documents */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardContent className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-4">{t.serviceDetail.requiredDocuments}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {localizedService.requiredDocuments.length > 0 ? (
                  localizedService.requiredDocuments.map((doc) => (
                    <div key={doc} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-sm text-foreground">{doc}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Required documents will be confirmed after the initial review.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Form */}
        <div className="animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
          <Card className="sticky top-20 shadow-card-hover">
            <CardContent className="p-6">
              <h2 className="text-xl font-heading font-semibold mb-1">{t.serviceDetail.requestThisService}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {isComingSoon ? t.serviceDetail.comingSoonNotice : `${t.serviceDetail.formHint}.`}
              </p>

              {formSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
                  <h3 className="font-heading font-semibold text-lg">{t.serviceDetail.requestSubmitted}</h3>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <fieldset disabled={isComingSoon || isSubmitting} className="space-y-4">
                    <Input placeholder={t.serviceDetail.namePlaceholder} value={formData.name} onChange={update("name")} required />
                    <div className="space-y-1.5">
                      <div className={`flex h-10 w-full items-center rounded-md border bg-background ${formErrors.phone ? "border-destructive" : "border-input"}`}>
                        <span className="flex h-full items-center border-r px-3 text-sm text-muted-foreground">+91</span>
                        <Input
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                            if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                          }}
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          aria-invalid={Boolean(formErrors.phone)}
                          className="h-full border-0 shadow-none focus-visible:ring-0"
                          required
                        />
                      </div>
                      {formErrors.phone ? <p className="text-xs text-destructive">{formErrors.phone}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                      <Input
                        type="email"
                        placeholder={t.serviceDetail.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => {
                          update("email")(e);
                          if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        aria-invalid={Boolean(formErrors.email)}
                      />
                      {formErrors.email ? <p className="text-xs text-destructive">{formErrors.email}</p> : null}
                    </div>
                    <Textarea placeholder={t.serviceDetail.notesPlaceholder} value={formData.notes} onChange={update("notes")} />
                    {hcaptchaSiteKey ? (
                      <div className="max-w-full overflow-hidden rounded-md">
                        <HCaptcha
                          ref={hcaptchaRef}
                          sitekey={hcaptchaSiteKey}
                          size="compact"
                          onVerify={(token) => setHcaptchaToken(token.trim())}
                          onExpire={() => {
                            setHcaptchaToken("");
                            toast({ title: "Security verification expired. Please try again." });
                          }}
                          onError={() => {
                            setHcaptchaToken("");
                            toast({ title: "Please complete the security check." });
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-destructive" role="alert">
                        Security verification is temporarily unavailable. Please try again later.
                      </p>
                    )}
                    <Button type="submit" className="w-full" disabled={!canSubmit}>
                      {isComingSoon ? t.serviceDetail.comingSoon : isSubmitting ? "Submitting..." : t.serviceDetail.submitRequest}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" asChild disabled={!CALL_NUMBER_HREF || isComingSoon}>
                      <a
                        href={CALL_NUMBER_HREF || "#"}
                        onClick={() =>
                          trackContact({
                            contact_channel: "phone",
                            surface: "service_detail_call_button",
                            destination: CALL_NUMBER_HREF || undefined,
                            service_slug: service.slug,
                          })
                        }
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        {t.serviceDetail.callNow} an expert
                      </a>
                    </Button>
                  </fieldset>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

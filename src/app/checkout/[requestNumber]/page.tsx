import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import CheckoutPaymentAction from "./CheckoutPaymentAction";
import { isRequestNumber } from "@/lib/request-number";
import { getCheckoutPaymentState } from "@/server/payment.service";
import { getCheckoutRequest } from "@/server/repositories/requests.supabase.repository";
import { CheckCircle2, CreditCard, FileText, ShieldCheck } from "lucide-react";

type Props = {
  params: Promise<{ requestNumber: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  return {
    title: "Secure Checkout | Linkup Legal",
    robots: { index: false, follow: false },
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "Not provided";

  return `+91 ******${digits.slice(-4)}`;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "Not provided";

  return `${name.slice(0, 2)}***@${domain}`;
}

function maskName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Not provided";
  if (trimmed.length === 1) return "*";

  return `${trimmed.slice(0, 2)}${"*".repeat(Math.min(6, trimmed.length - 2))}`;
}

function CheckoutUnavailable() {
  return (
    <Layout>
      <section className="container py-12 md:py-16">
        <Card className="mx-auto max-w-xl border shadow-sm">
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="font-heading text-2xl font-bold text-foreground">Checkout is temporarily unavailable</h1>
            <p className="text-sm text-muted-foreground">
              We could not load this payment summary right now. Please retry shortly or contact our team for help.
            </p>
            <Button asChild>
              <Link href="/services">Browse Services</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { requestNumber: encodedRequestNumber } = await params;
  const query = await searchParams;
  const checkoutToken = typeof query.token === "string" ? query.token : "";
  let requestNumber: string;
  try {
    requestNumber = decodeURIComponent(encodedRequestNumber);
  } catch {
    notFound();
  }

  if (!isRequestNumber(requestNumber)) notFound();

  let request;
  try {
    request = await getCheckoutRequest(requestNumber, checkoutToken);
  } catch {
    console.error("checkout_request_load_failed", {
      requestNumber,
    });
    return <CheckoutUnavailable />;
  }

  if (!request) notFound();

  const paymentState = getCheckoutPaymentState(request);

  return (
    <Layout>
      <section className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-3">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              Linkup Legal Checkout
            </Badge>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
                  Payment Summary
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Request {request.requestNumber} is ready for review and payment.
                </p>
              </div>
              <Badge className="w-fit bg-amber-100 text-amber-700 hover:bg-amber-100">
                {paymentState.statusLabel}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <Card className="border shadow-sm">
              <CardContent className="space-y-6 p-6">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Service Request
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{request.serviceName}</h2>
                  {request.category ? (
                    <p className="mt-1 text-sm text-muted-foreground">{request.category}</p>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Base amount</span>
                      <span className="font-medium">{formatCurrency(request.baseAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">GST ({request.gstRate}%)</span>
                      <span className="font-medium">{formatCurrency(request.gstAmount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-foreground">Total payable</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(request.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Customer</div>
                    <div className="mt-1 font-medium">{maskName(request.customerName)}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Contact</div>
                    <div className="mt-1 text-sm">{maskPhone(request.phone)}</div>
                    <div className="text-sm text-muted-foreground">{maskEmail(request.email)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Secure Payment</h2>
                  <p className="text-sm text-muted-foreground">{paymentState.detail}</p>
                </div>

                <CheckoutPaymentAction
                  requestNumber={request.requestNumber}
                  checkoutToken={checkoutToken}
                  serviceName={request.serviceName}
                  paymentState={paymentState}
                />

                <div className="space-y-3 border-t pt-4">
                  {[
                    "No Hidden Charges",
                    "GST Included",
                    "Secure Payment Verification",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    Payment safety
                  </div>
                  {paymentState.canPay
                    ? "Payment details are processed by Razorpay and verified on our server before this request is marked paid."
                    : "Our team will share the secure payment link after reviewing your request."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}

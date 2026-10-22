import "server-only";

import { isRazorpayCheckoutConfigured } from "./razorpay.service";
import type { PaymentSummaryRequest } from "./repositories/requests.supabase.repository";
import { isSupabaseStorageEnabled } from "./repositories/storage-mode";
import { isPayablePricing } from "@/lib/service-pricing";

export type CheckoutPaymentState = {
  statusLabel: string;
  canPay: boolean;
  buttonLabel: string;
  detail: string;
};

export function getCheckoutPaymentState(request: Pick<PaymentSummaryRequest, "paymentStatus" | "pricingType" | "totalAmount">): CheckoutPaymentState {
  const { paymentStatus } = request;

  if (!isPayablePricing(request.pricingType, request.totalAmount)) {
    return {
      statusLabel: "Price Confirmation Required",
      canPay: false,
      buttonLabel: "Price Confirmation Required",
      detail: "Our team will confirm the final price before payment is requested.",
    };
  }

  if (paymentStatus === "captured") {
    return {
      statusLabel: "Payment Completed",
      canPay: false,
      buttonLabel: "Payment Completed",
      detail: "This request is already marked as paid.",
    };
  }

  if (paymentStatus === "authorized") {
    return {
      statusLabel: "Payment Authorized",
      canPay: false,
      buttonLabel: "Payment Processing",
      detail: "Your payment is being confirmed by Razorpay.",
    };
  }

  if (paymentStatus === "failed" || paymentStatus === "verification_failed") {
    return {
      statusLabel: "Payment Failed",
      canPay: isSupabaseStorageEnabled() && isRazorpayCheckoutConfigured(),
      buttonLabel: isSupabaseStorageEnabled() && isRazorpayCheckoutConfigured() ? "Retry Payment" : "Payment Coming Soon",
      detail: isSupabaseStorageEnabled() && isRazorpayCheckoutConfigured()
        ? "You can safely retry your payment. Your payable amount is verified on the server."
        : "Online payment is being enabled. Our team will contact you shortly.",
    };
  }

  if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
    return {
      statusLabel: paymentStatus === "refunded" ? "Refunded" : "Partially Refunded",
      canPay: false,
      buttonLabel: "Payment Refunded",
      detail: "This payment was refunded. Please contact our team if you need to make another payment.",
    };
  }

  if (!isSupabaseStorageEnabled() || !isRazorpayCheckoutConfigured()) {
    return {
      statusLabel: "Pending for Payment",
      canPay: false,
      buttonLabel: "Payment Coming Soon",
      detail: "Online payment is being enabled. Our team will contact you shortly.",
    };
  }

  return {
    statusLabel: "Pending for Payment",
    canPay: true,
    buttonLabel: "Pay Now",
    detail: "Your payable amount is verified on the server before payment is started.",
  };
}

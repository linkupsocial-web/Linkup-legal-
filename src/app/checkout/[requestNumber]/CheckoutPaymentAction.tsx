"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutPaymentState } from "@/server/payment.service";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on?: (event: "payment.failed", handler: () => void) => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let razorpayScriptPromise: Promise<RazorpayConstructor> | null = null;

function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  const scriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existingScript = document.getElementById("razorpay-checkout-script") as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
        } else {
          reject(new Error("Payment checkout could not be loaded."));
        }
      }, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Payment checkout could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error("Payment checkout could not be loaded."));
      }
    };
    script.onerror = () => reject(new Error("Payment checkout could not be loaded."));
    document.body.appendChild(script);
  }).catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  razorpayScriptPromise = scriptPromise;
  return scriptPromise;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The payment service returned an invalid response.");
  }

  const data = payload as Record<string, unknown>;
  if (!response.ok || data.ok !== true) {
    throw new Error(typeof data.message === "string" ? data.message : "Unable to process payment right now.");
  }

  return data;
}

export default function CheckoutPaymentAction({
  requestNumber,
  checkoutToken,
  serviceName,
  paymentState,
}: {
  requestNumber: string;
  checkoutToken: string;
  serviceName: string;
  paymentState: CheckoutPaymentState;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verifyPayment = async (payment: RazorpaySuccessResponse) => {
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestNumber,
          checkoutToken,
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        }),
      });
      await readJsonResponse(response);
      setMessage("Payment confirmed. Your request is now marked as paid.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment verification failed. Please contact our team.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startPayment = async () => {
    if (!paymentState.canPay || isProcessing) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestNumber, checkoutToken }),
      });
      const order = await readJsonResponse(response);
      const orderId = typeof order.orderId === "string" ? order.orderId : "";
      const keyId = typeof order.keyId === "string" ? order.keyId : "";
      const amount = typeof order.amount === "number" ? order.amount : Number(order.amount);
      const currency = typeof order.currency === "string" ? order.currency : "";

      if (!orderId || !keyId || !Number.isInteger(amount) || amount <= 0 || !currency) {
        throw new Error("The payment order is invalid. Please try again.");
      }

      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Linkup Legal",
        description: serviceName,
        order_id: orderId,
        handler: (payment) => {
          void verifyPayment(payment);
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });
      checkout.on?.("payment.failed", () => {
        setMessage("Payment was not completed. You can try again when ready.");
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start payment right now.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button className="w-full" disabled={!paymentState.canPay || isProcessing} onClick={startPayment}>
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isProcessing ? "Processing Payment" : paymentState.buttonLabel}
      </Button>
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}

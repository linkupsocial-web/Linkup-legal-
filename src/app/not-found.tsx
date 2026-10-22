import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Linkup Legal",
  description:
    "The page you are looking for could not be found. Browse Linkup Legal for GST, registration, licensing, and compliance services in India.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-6xl font-heading font-bold text-foreground">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">Oops! Page not found</p>
      <p className="mt-2 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button className="mt-8" asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}

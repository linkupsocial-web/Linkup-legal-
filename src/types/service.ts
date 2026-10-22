import type { ServiceStatus } from "../lib/service-status";
import type { ServicePricingType } from "../lib/service-pricing";

export interface Service {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  icon: string;
  image: string;
  price: number;
  pricingType?: ServicePricingType;
  priceMin?: number | null;
  priceMax?: number | null;
  priceNote?: string | null;
  duration: string;
  customersServed: number;
  requiredDocuments: string[];
  features: string[];
  popular?: boolean;
  status?: ServiceStatus;
  priority?: number;
}

export type ServiceCardItem = Pick<
  Service,
  "id" | "slug" | "title" | "description" | "category" | "icon" | "image" | "duration" | "popular"
>;

export type ServiceSuggestionItem = Pick<Service, "id" | "slug" | "title" | "category" | "icon">;

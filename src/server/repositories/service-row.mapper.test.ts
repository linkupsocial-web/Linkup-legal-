import assert from "node:assert/strict";
import { mapSupabaseServiceRow } from "./service-row.mapper";

const service = mapSupabaseServiceRow({
  id: "service-1",
  slug: "gst-registration",
  title: "GST Registration",
  description: null,
  category: "Tax Services",
  category_slug: "tax-services",
  icon: null,
  image: "/services/placeholders/gst-registration.svg",
  price: "1499",
  duration: null,
  customers_served: 120,
  features: '["Eligibility review","Document review","Eligibility review"]',
  required_documents: ["PAN Card", "Aadhaar Card"],
  status: "active",
  priority: 3,
  popular: true,
  created_at: null,
  updated_at: null,
});

assert.equal(service.categorySlug, "tax-services");
assert.equal(service.image, "/services/placeholders/gst-registration.svg");
assert.deepEqual(service.features, ["Eligibility review", "Document review"]);
assert.deepEqual(service.requiredDocuments, ["PAN Card", "Aadhaar Card"]);
assert.equal(service.status, "available");
assert.equal(service.customersServed, 120);

console.log("supabase service row mapping: OK");

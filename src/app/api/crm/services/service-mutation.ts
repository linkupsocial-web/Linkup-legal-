import { validateServiceContentInput } from "@/lib/service-content";
import { isServicePricingType } from "@/lib/service-pricing";
import { parseServiceStatus } from "@/lib/service-status";
import type { ServiceUpdatePatch } from "@/server/repositories/services.supabase.repository";
import type { CrmServiceMutationBody } from "./service-request";

type ServiceMutationValidationResult =
  | { ok: true; value: ServiceUpdatePatch }
  | { ok: false; error: string };

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

export function validateCrmServiceMutation(body: CrmServiceMutationBody): ServiceMutationValidationResult {
  const stringFields = [body.title, body.slug, body.description, body.category, body.icon, body.image, body.duration];
  if (!stringFields.every(isOptionalString)) {
    return { ok: false, error: "Service text fields must be strings." };
  }

  const numberFields = [body.priority, body.price, body.customersServed];
  if (!numberFields.every(isOptionalFiniteNumber)) {
    return { ok: false, error: "Service numeric fields must be valid numbers." };
  }

  if (!isOptionalBoolean(body.popular)) {
    return { ok: false, error: "Popular must be true or false." };
  }

  const status = body.status !== undefined ? parseServiceStatus(body.status) : undefined;
  if (body.status !== undefined && !status) {
    return { ok: false, error: "Invalid status" };
  }

  if (body.pricingType !== undefined && !isServicePricingType(body.pricingType)) {
    return { ok: false, error: "Invalid pricing type" };
  }

  const content = validateServiceContentInput(body);
  if (!content.ok) {
    return { ok: false, error: content.error };
  }

  return {
    ok: true,
    value: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(content.value.image !== undefined ? { image: content.value.image } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.pricingType !== undefined ? { pricingType: body.pricingType } : {}),
      ...(body.duration !== undefined ? { duration: body.duration } : {}),
      ...(body.customersServed !== undefined ? { customersServed: body.customersServed } : {}),
      ...(content.value.requiredDocuments !== undefined ? { requiredDocuments: content.value.requiredDocuments } : {}),
      ...(content.value.features !== undefined ? { features: content.value.features } : {}),
      ...(body.popular !== undefined ? { popular: body.popular } : {}),
      ...(status ? { status } : {}),
    },
  };
}

export type CrmServiceMutationBody = {
  title?: string;
  slug?: string;
  priority?: number;
  description?: string;
  category?: string;
  icon?: string;
  image?: string;
  price?: number;
  pricingType?: string;
  duration?: string;
  customersServed?: number;
  requiredDocuments?: string[];
  features?: string[];
  popular?: boolean;
  status?: string;
};

export type ParsedCrmServiceMutationRequest = {
  body: CrmServiceMutationBody;
  imageFile: File | null;
};

export class InvalidCrmServiceMutationRequestError extends Error {
  constructor(message = "Invalid request") {
    super(message);
    this.name = "InvalidCrmServiceMutationRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function parseCrmServiceMutationRequest(req: Request): Promise<ParsedCrmServiceMutationRequest> {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = await req.json();
    if (!isRecord(body)) throw new InvalidCrmServiceMutationRequestError();

    return { body: body as CrmServiceMutationBody, imageFile: null };
  }

  const formData = await req.formData();
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") throw new InvalidCrmServiceMutationRequestError();

  let body: unknown;
  try {
    body = JSON.parse(rawPayload);
  } catch {
    throw new InvalidCrmServiceMutationRequestError();
  }

  if (!isRecord(body)) throw new InvalidCrmServiceMutationRequestError();

  const image = formData.get("image");
  if (image !== null && !isFile(image)) {
    throw new InvalidCrmServiceMutationRequestError("Image upload is invalid.");
  }

  return { body: body as CrmServiceMutationBody, imageFile: image };
}

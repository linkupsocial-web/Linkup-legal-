import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const SERVICE_IMAGE_BUCKET_ID = "service-images";
export const SERVICE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ServiceImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceImageUploadError";
  }
}

export function getServiceImageValidationError(file: Pick<File, "type" | "size">): string | null {
  if (!(file.type in IMAGE_EXTENSIONS)) {
    return "Use a JPG, PNG, WEBP, or GIF image.";
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "The selected image is empty.";
  }

  if (file.size > SERVICE_IMAGE_MAX_BYTES) {
    return "Service images must be 5 MB or smaller.";
  }

  return null;
}

export type UploadedServiceImage = {
  path: string;
  publicUrl: string;
};

export async function uploadServiceImage(serviceId: string, file: File): Promise<UploadedServiceImage> {
  if (!UUID_PATTERN.test(serviceId)) {
    throw new ServiceImageUploadError("The service identifier is invalid.");
  }

  const validationError = getServiceImageValidationError(file);
  if (validationError) throw new ServiceImageUploadError(validationError);

  const extension = IMAGE_EXTENSIONS[file.type];
  const path = `services/${serviceId}/${Date.now()}-${randomUUID()}.${extension}`;
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(SERVICE_IMAGE_BUCKET_ID)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error || !data?.path) {
    const message = error?.message?.toLowerCase() ?? "";
    if (message.includes("bucket")) {
      throw new ServiceImageUploadError("Service image storage is not configured. Apply the service image storage migration.");
    }

    throw new ServiceImageUploadError("The service image could not be uploaded.");
  }

  const { data: publicUrlData } = supabase.storage.from(SERVICE_IMAGE_BUCKET_ID).getPublicUrl(data.path);
  if (!publicUrlData.publicUrl) {
    await removeServiceImage(data.path);
    throw new ServiceImageUploadError("The service image URL could not be generated.");
  }

  return { path: data.path, publicUrl: publicUrlData.publicUrl };
}

export async function removeServiceImage(path: string): Promise<void> {
  if (!path.startsWith("services/")) return;

  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.storage.from(SERVICE_IMAGE_BUCKET_ID).remove([path]);
  } catch {
    // The primary database error remains the useful failure if cleanup cannot complete.
  }
}

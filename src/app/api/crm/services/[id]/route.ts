import { NextRequest, NextResponse } from "next/server";
import {
  deleteService,
  getStoredServiceById,
  updateService,
} from "@/server/repositories/services.supabase.repository";
import {
  getServiceImageValidationError,
  removeServiceImage,
  uploadServiceImage,
  type UploadedServiceImage,
} from "@/server/repositories/service-image-storage";
import { getCrmSession } from "@/lib/crm-session";
import { validateCrmServiceMutation } from "../service-mutation";
import {
  InvalidCrmServiceMutationRequestError,
  parseCrmServiceMutationRequest,
} from "../service-request";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let request: Awaited<ReturnType<typeof parseCrmServiceMutationRequest>>;
  try {
    request = await parseCrmServiceMutationRequest(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof InvalidCrmServiceMutationRequestError ? error.message : "Invalid request" },
      { status: 400 }
    );
  }

  const mutation = validateCrmServiceMutation(request.body);
  if (!mutation.ok) return NextResponse.json({ error: mutation.error }, { status: 400 });

  if (request.imageFile) {
    const imageError = getServiceImageValidationError(request.imageFile);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  let existing;
  try {
    existing = await getStoredServiceById(id);
  } catch {
    return NextResponse.json({ error: "Service storage is temporarily unavailable." }, { status: 502 });
  }
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let uploadedImage: UploadedServiceImage | null = null;
  try {
    if (request.imageFile) {
      uploadedImage = await uploadServiceImage(existing.id, request.imageFile);
    }

    const updated = await updateService(
      existing.id,
      {
        ...mutation.value,
        ...(uploadedImage ? { image: uploadedImage.publicUrl } : {}),
      },
      existing
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    if (uploadedImage) await removeServiceImage(uploadedImage.path);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Service could not be updated." },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const existing = await getStoredServiceById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deleted = await deleteService(id, existing);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Service could not be deleted." }, { status: 502 });
  }
}

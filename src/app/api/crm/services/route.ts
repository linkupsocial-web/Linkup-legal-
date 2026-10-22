import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  addService,
  getCrmServices,
  getServiceStats,
  listCrmServicesPaginated,
} from "@/server/repositories/services.supabase.repository";
import {
  getServiceImageValidationError,
  removeServiceImage,
  uploadServiceImage,
  type UploadedServiceImage,
} from "@/server/repositories/service-image-storage";
import { getCrmSession } from "@/lib/crm-session";
import { validateCrmServiceMutation } from "./service-mutation";
import {
  InvalidCrmServiceMutationRequestError,
  parseCrmServiceMutationRequest,
} from "./service-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "15");
  const statsOnly = searchParams.get("stats") === "1";

  try {
    if (statsOnly) {
      const allServices = await getCrmServices();
      return NextResponse.json(getServiceStats(allServices));
    }

    return NextResponse.json(await listCrmServicesPaginated({ status, search, page, limit }));
  } catch {
    return NextResponse.json({ error: "Service storage is temporarily unavailable." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (!mutation.value.title?.trim()) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  if (request.imageFile) {
    const imageError = getServiceImageValidationError(request.imageFile);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  let uploadedImage: UploadedServiceImage | null = null;
  try {
    const serviceId = request.imageFile ? randomUUID() : undefined;
    if (request.imageFile && serviceId) {
      uploadedImage = await uploadServiceImage(serviceId, request.imageFile);
    }

    const created = await addService({
      ...mutation.value,
      title: mutation.value.title.trim(),
      ...(serviceId ? { id: serviceId } : {}),
      ...(uploadedImage ? { image: uploadedImage.publicUrl } : {}),
    });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    if (uploadedImage) await removeServiceImage(uploadedImage.path);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Service could not be created." },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { addRequest } from "@/lib/crm-store";

export async function POST(req: NextRequest) {
  let body: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    service: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (!body.name || !body.phone || !body.service) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await addRequest({
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() ?? "",
      notes: body.notes?.trim() ?? "",
      service: body.service.trim(),
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lead storage is temporarily unavailable." }, { status: 502 });
  }
}

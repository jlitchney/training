import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDemoVideo, deleteDemoVideo } from "@/lib/kv";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const updated = await updateDemoVideo(id, {
    ...(body.title !== undefined && { title: body.title.trim() }),
    ...(body.clientName !== undefined && { clientName: body.clientName.trim() }),
    ...(body.notes !== undefined && { notes: body.notes.trim() || undefined }),
    ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteDemoVideo(id);
  return new NextResponse(null, { status: 204 });
}

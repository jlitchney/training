import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateVideo, deleteVideo } from "@/lib/kv";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const productId = body.productId as string;
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const video = await updateVideo(productId, id, body);
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(video);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  await deleteVideo(productId, id);
  return NextResponse.json({ ok: true });
}

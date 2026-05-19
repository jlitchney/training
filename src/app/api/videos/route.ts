import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVideos, createVideo } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const session = await getSession();
  const publishedOnly = !session; // unauthenticated users see only published
  const videos = await getVideos(productId, publishedOnly);
  return NextResponse.json(videos, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const video = await createVideo({
    productId: body.productId,
    title: body.title,
    description: body.description ?? "",
    blobUrl: body.blobUrl,
    published: false,
    recordedBy: session.name,
    duration: body.duration,
    tags: body.tags ?? [],
  });
  return NextResponse.json(video, { status: 201 });
}

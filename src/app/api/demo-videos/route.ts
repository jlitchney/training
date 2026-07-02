import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDemoVideos, createDemoVideo } from "@/lib/kv";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const videos = await getDemoVideos();
  return NextResponse.json(videos, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim() || !body.blobUrl) {
    return NextResponse.json({ error: "Missing title or blobUrl" }, { status: 400 });
  }

  const video = await createDemoVideo({
    title: body.title.trim(),
    clientName: body.clientName?.trim() ?? "",
    notes: body.notes?.trim() ?? undefined,
    blobUrl: body.blobUrl,
    thumbnailUrl: body.thumbnailUrl ?? undefined,
    duration: body.duration ?? undefined,
    recordedBy: session.name,
  });
  return NextResponse.json(video, { status: 201 });
}

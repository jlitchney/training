import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVideos, createVideo, getProduct, getChecklist } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const session = await getSession();
  const forcePublished = req.nextUrl.searchParams.get("publishedOnly") === "true";
  const publishedOnly = !session || forcePublished;
  let videos = await getVideos(productId, publishedOnly);

  if (!session) {
    videos = videos.filter((v) => v.visibility !== "internal");

    const product = await getProduct(productId);
    const catViz = product?.categoryVisibility ?? {};
    const internalCats = Object.entries(catViz)
      .filter(([, v]) => v === "internal")
      .map(([k]) => k);

    if (internalCats.length > 0) {
      const checklist = await getChecklist(productId);
      const videoToCat: Record<string, string> = {};
      for (const item of checklist) {
        const vid = item.video?.id ?? item.videoId;
        if (vid && item.category) videoToCat[vid] = item.category;
      }
      videos = videos.filter((v) => !internalCats.includes(videoToCat[v.id]));
    }
  }

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
    thumbnailUrl: body.thumbnailUrl,
  });
  return NextResponse.json(video, { status: 201 });
}

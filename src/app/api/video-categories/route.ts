import { NextRequest, NextResponse } from "next/server";
import { getChecklist, getProduct } from "@/lib/kv";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({}, { status: 400 });

  const checklist = await getChecklist(productId);
  const map: Record<string, string> = {};
  for (const item of checklist) {
    if (!item.category) continue;
    if (item.video?.id) map[item.video.id] = item.category;
    else if (item.videoId) map[item.videoId] = item.category;
  }

  const session = await getSession();
  if (!session) {
    const product = await getProduct(productId);
    const catViz = product?.categoryVisibility ?? {};
    for (const videoId of Object.keys(map)) {
      if (catViz[map[videoId]] === "internal") delete map[videoId];
    }
  }

  return NextResponse.json(map, { headers: { "Cache-Control": "no-store" } });
}

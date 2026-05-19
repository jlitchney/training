import { NextRequest, NextResponse } from "next/server";
import { getChecklist } from "@/lib/kv";

// Public endpoint — returns a videoId → category map for a product.
// Used by the public video page to filter related videos by category.
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
  return NextResponse.json(map, { headers: { "Cache-Control": "no-store" } });
}

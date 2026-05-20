import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVideoByBlobUrl } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  if (!url.includes(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    const result = await getVideoByBlobUrl(url);
    if (result) {
      const { video, product, category } = result;
      const isInternal =
        video.visibility === "internal" ||
        product.visibility === "internal" ||
        (category !== undefined && product.categoryVisibility?.[category] === "internal");
      if (isInternal) {
        return new NextResponse(null, { status: 401 });
      }
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const upstreamHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
  const range = req.headers.get("range");
  if (range) upstreamHeaders["range"] = range;

  const upstream = await fetch(url, { headers: upstreamHeaders });
  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: `Blob fetch failed: ${upstream.status}` }, { status: upstream.status });
  }

  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };
  const contentRange = upstream.headers.get("content-range");
  const contentLength = upstream.headers.get("content-length");
  if (contentRange) headers["Content-Range"] = contentRange;
  if (contentLength) headers["Content-Length"] = contentLength;

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  if (!url.includes(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return NextResponse.json({ error: `Blob fetch failed: ${res.status}` }, { status: res.status });

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

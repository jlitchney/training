import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDemoVideo } from "@/lib/kv";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getDemoVideo(id);
  if (!video) return new Response("Not found", { status: 404 });

  // Fetch thumbnail as a base64 data URL so Satori can render it
  let thumbnailDataUrl: string | null = null;
  if (video.thumbnailUrl) {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch(video.thumbnailUrl, { headers });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const ct = resp.headers.get("content-type") ?? "image/jpeg";
        thumbnailDataUrl = `data:${ct};base64,${buf.toString("base64")}`;
      }
    } catch { /* fall through to placeholder */ }
  }

  const W = 1120, H = 630;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, position: "relative", display: "flex", background: "#111827" }}>
        {/* Thumbnail or dark placeholder */}
        {thumbnailDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailDataUrl}
            alt=""
            style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 36, color: "#6b7280", fontFamily: "sans-serif", textAlign: "center", maxWidth: 700, padding: "0 40px" }}>
              {video.title}
            </div>
          </div>
        )}

        {/* Semi-transparent overlay so play button pops */}
        <div style={{ position: "absolute", inset: "0", background: "rgba(0,0,0,0.28)" }} />

        {/* Play button */}
        <div style={{
          position: "absolute", inset: "0",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 108, height: 108, borderRadius: "50%",
            background: "rgba(255,255,255,0.93)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 32px rgba(0,0,0,0.45)",
          }}>
            <div style={{ fontSize: 48, color: "#111827", lineHeight: "1", paddingLeft: "8px" }}>▶</div>
          </div>
        </div>

        {/* Bottom bar: title + client */}
        <div style={{
          position: "absolute", bottom: "0", left: "0", right: "0",
          background: "rgba(0,0,0,0.72)",
          padding: "18px 32px",
          display: "flex", alignItems: "center", gap: "16px",
        }}>
          <div style={{ fontSize: 26, color: "#ffffff", fontFamily: "sans-serif", fontWeight: 700, flex: 1 }}>
            {video.title}
          </div>
          {video.clientName && (
            <div style={{ fontSize: 20, color: "#94a3b8", fontFamily: "sans-serif", flexShrink: 0 }}>
              {video.clientName}
            </div>
          )}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}

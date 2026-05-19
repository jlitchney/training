import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// This endpoint handles two requests from the client-side upload SDK:
// 1. Generate a short-lived upload token (browser uploads directly to Blob)
// 2. Notify that the upload completed
// This bypasses the 4.5MB serverless body limit entirely.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "video/webm", "video/mp4", "video/quicktime",
          "image/jpeg", "image/png", "image/gif", "image/webp",
        ],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        tokenPayload: session.email,
      }),
      onUploadCompleted: async () => {
        // Nothing to do — video metadata is saved separately via /api/videos
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err: unknown) {
    let msg = "unknown";
    if (err instanceof Error) msg = `${err.constructor.name}: ${err.message}`;
    else { try { msg = JSON.stringify(err); } catch { msg = String(err); } }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

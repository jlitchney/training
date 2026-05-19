import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `training/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "private" });
    return NextResponse.json({ url: blob.url });
  } catch (err: unknown) {
    let msg = "unknown";
    if (err instanceof Error) {
      msg = `${err.constructor.name}: ${err.message}`;
    } else {
      try { msg = JSON.stringify(err); } catch { msg = String(err); }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

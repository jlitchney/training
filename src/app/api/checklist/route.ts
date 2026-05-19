import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChecklist, addChecklistItem, saveChecklist, linkChecklistVideo } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  const items = await getChecklist(productId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();

  if (body.type === "add") {
    const item = await addChecklistItem(body.productId, body.title, body.description);
    return NextResponse.json(item, { status: 201 });
  }

  if (body.type === "link") {
    await linkChecklistVideo(body.productId, body.itemId, body.videoId ?? null);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "reorder") {
    await saveChecklist(body.productId, body.items);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "delete") {
    const items = await getChecklist(body.productId);
    await saveChecklist(body.productId, items.filter((i) => i.id !== body.itemId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

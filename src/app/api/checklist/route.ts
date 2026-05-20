import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChecklist, addChecklistItem, saveChecklist, linkChecklistVideo, updateChecklistItem } from "@/lib/kv";

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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  if (body.type === "add") {
    const item = await addChecklistItem(body.productId, body.title, body.description, body.category ?? undefined, body.itemType ?? undefined);
    return NextResponse.json(item, { status: 201 });
  }

  if (body.type === "link") {
    await linkChecklistVideo(body.productId, body.itemId, body.videoId ?? null, body.video);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "reorder") {
    await saveChecklist(body.productId, body.items);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "update") {
    const patch: Parameters<typeof updateChecklistItem>[2] = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.articleContent !== undefined && { articleContent: body.articleContent }),
      ...(body.visibility !== undefined && { visibility: body.visibility }),
    };
    const item = await updateChecklistItem(body.productId, body.itemId, patch);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  }

  if (body.type === "delete") {
    const items = await getChecklist(body.productId);
    await saveChecklist(body.productId, items.filter((i) => i.id !== body.itemId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

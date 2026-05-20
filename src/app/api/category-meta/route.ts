import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCategoryMeta, saveCategoryMeta } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  return NextResponse.json(await getCategoryMeta(productId));
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  const patch = await req.json();
  const current = await getCategoryMeta(productId);
  const updated = { ...current, ...patch };
  await saveCategoryMeta(productId, updated);
  return NextResponse.json(updated);
}

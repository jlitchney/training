import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateProduct, deleteProduct } from "@/lib/kv";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  const body = await req.json();
  const product = await updateProduct(slug, body);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  await deleteProduct(slug);
  return NextResponse.json({ ok: true });
}

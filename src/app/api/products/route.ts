import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProducts, createProduct } from "@/lib/kv";

export async function GET() {
  const session = await getSession();
  const products = await getProducts();
  const visible = session ? products : products.filter((p) => p.visibility !== "internal");
  return NextResponse.json(visible);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const product = await createProduct({
    name: body.name,
    slug: body.slug,
    description: body.description ?? "",
    color: body.color ?? "blue",
    emoji: body.emoji ?? "⭐",
  });
  return NextResponse.json(product, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChecklist, getProduct } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json([], { status: 400 });

  const [session, product] = await Promise.all([getSession(), getProduct(productId)]);
  if (!product) return NextResponse.json([]);
  if (product.visibility === "internal" && !session) return NextResponse.json([]);

  const checklist = await getChecklist(productId);
  let articles = checklist.filter(
    (i) => i.type === "article" && i.articleContent?.trim(),
  );

  if (!session) {
    const catViz = product.categoryVisibility ?? {};
    articles = articles.filter((i) => {
      const cat = i.category?.trim() || "Uncategorized";
      if (catViz[cat] === "internal") return false;
      if (i.visibility === "internal") return false;
      return true;
    });
  }

  return NextResponse.json(articles, { headers: { "Cache-Control": "no-store" } });
}

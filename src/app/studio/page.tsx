"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji: string;
}

interface Video {
  id: string;
  title: string;
  published: boolean;
}

const COLOR_CLASSES: Record<string, { bg: string; light: string; border: string }> = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   border: "border-blue-200" },
  purple: { bg: "bg-purple-600", light: "bg-purple-50", border: "border-purple-200" },
  green:  { bg: "bg-green-600",  light: "bg-green-50",  border: "border-green-200" },
  orange: { bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-200" },
  pink:   { bg: "bg-pink-600",   light: "bg-pink-50",   border: "border-pink-200" },
  teal:   { bg: "bg-teal-600",   light: "bg-teal-50",   border: "border-teal-200" },
};

function colorFor(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

export default function StudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [videoMap, setVideoMap] = useState<Record<string, Video[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) { router.push("/login"); return null; }
        return r.json();
      })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return fetch("/api/products").then((r) => r.json());
      })
      .then(async (prods?: Product[]) => {
        if (!prods) return;
        setProducts(prods);
        const map: Record<string, Video[]> = {};
        await Promise.all(
          prods.map(async (p) => {
            const res = await fetch(`/api/videos?productId=${p.id}`);
            map[p.id] = await res.json();
          })
        );
        setVideoMap(map);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
            <span className="text-sm text-gray-500 hidden sm:block">Recording Studio</span>
          </div>
          {user && <UserMenu user={user} />}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a product to record</h1>
          <p className="text-sm text-gray-500">Select a product to see its recording checklist and upload videos.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const videos = videoMap[product.id] ?? [];
            const published = videos.filter((v) => v.published).length;
            const total = videos.length;
            const c = colorFor(product.color);
            return (
              <Link
                key={product.id}
                href={`/studio/${product.slug}`}
                className={`rounded-xl border p-5 hover:shadow-md transition-all ${c.light} ${c.border}`}
              >
                <div className="text-3xl mb-3">{product.emoji}</div>
                <h2 className="font-semibold text-gray-900 mb-1">{product.name}</h2>
                <p className="text-xs text-gray-500 mb-4">{product.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{total} video{total !== 1 ? "s" : ""}</span>
                  <span className="font-medium text-green-600">{published} published</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

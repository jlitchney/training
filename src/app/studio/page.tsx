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

const COLOR_CLASSES: Record<string, { bg: string; dot: string }> = {
  blue:    { bg: "bg-blue-600",    dot: "bg-blue-500" },
  indigo:  { bg: "bg-indigo-600",  dot: "bg-indigo-500" },
  violet:  { bg: "bg-violet-600",  dot: "bg-violet-500" },
  purple:  { bg: "bg-purple-600",  dot: "bg-purple-500" },
  pink:    { bg: "bg-pink-600",    dot: "bg-pink-500" },
  rose:    { bg: "bg-rose-600",    dot: "bg-rose-500" },
  red:     { bg: "bg-red-600",     dot: "bg-red-500" },
  orange:  { bg: "bg-orange-500",  dot: "bg-orange-500" },
  amber:   { bg: "bg-amber-500",   dot: "bg-amber-500" },
  lime:    { bg: "bg-lime-600",    dot: "bg-lime-500" },
  green:   { bg: "bg-green-600",   dot: "bg-green-500" },
  emerald: { bg: "bg-emerald-600", dot: "bg-emerald-500" },
  teal:    { bg: "bg-teal-600",    dot: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-600",    dot: "bg-cyan-500" },
  sky:     { bg: "bg-sky-500",     dot: "bg-sky-400" },
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
          <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link
                href="/"
                className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors"
              >
                Knowledge Base
              </Link>
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm">
                Recording Studio
              </span>
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a topic to record</h1>
          <p className="text-sm text-gray-500">Select a topic to see its recording checklist and upload videos.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const videos = videoMap[product.id] ?? [];
            const published = videos.filter((v) => v.published).length;
            const total = videos.length;
            const c = colorFor(product.color);
            return (
              <Link
                key={product.id}
                href={`/studio/${product.slug}`}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group flex items-start gap-4"
              >
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                  {product.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                      {total} video{total !== 1 ? "s" : ""}
                    </span>
                    {published > 0 && (
                      <span className="text-green-600 font-medium">{published} published</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

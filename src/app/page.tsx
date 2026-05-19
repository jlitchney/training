"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  productId: string;
  title: string;
  description: string;
  duration?: number;
}

const COLOR_CLASSES: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700",   dot: "bg-green-500" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  pink:   { bg: "bg-pink-50",   border: "border-pink-200",   badge: "bg-pink-100 text-pink-700",     dot: "bg-pink-500" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-700",     dot: "bg-teal-500" },
};

function colorFor(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allVideos, setAllVideos] = useState<Record<string, Video[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(async (prods: Product[]) => {
        setProducts(prods);
        const videoMap: Record<string, Video[]> = {};
        await Promise.all(
          prods.map(async (p) => {
            const res = await fetch(`/api/videos?productId=${p.id}`);
            videoMap[p.id] = await res.json();
          })
        );
        setAllVideos(videoMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const results: { product: Product; video: Video }[] = [];
  if (query) {
    for (const product of products) {
      for (const video of allVideos[product.id] ?? []) {
        if (
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          product.name.toLowerCase().includes(query)
        ) {
          results.push({ product, video });
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">All-Star Training</span>
            <span className="text-sm text-gray-400 hidden sm:block">Video Knowledge Base</span>
          </div>
          <Link
            href="/studio"
            className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            Staff Login →
          </Link>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">How can we help?</h1>
          <p className="text-gray-500 mb-8">Search our video library to learn how to use All-Star products.</p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            className="w-full border border-gray-300 rounded-xl px-5 py-3 text-base shadow-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : query ? (
          <div>
            <p className="text-sm text-gray-500 mb-6">
              {results.length === 0
                ? `No results for "${search}"`
                : `${results.length} result${results.length !== 1 ? "s" : ""} for "${search}"`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(({ product, video }) => {
                const c = colorFor(product.color);
                return (
                  <Link
                    key={video.id}
                    href={`/${product.slug}/${video.id}`}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${c.badge}`}>
                      {product.emoji} {product.name}
                    </span>
                    <h3 className="font-medium text-gray-900 mb-1 leading-snug">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>
                    )}
                    {video.duration && (
                      <p className="text-xs text-gray-400 mt-2">{formatDuration(video.duration)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const videos = allVideos[product.id] ?? [];
              const c = colorFor(product.color);
              return (
                <Link
                  key={product.id}
                  href={`/${product.slug}`}
                  className={`rounded-xl border p-6 hover:shadow-md transition-all ${c.bg} ${c.border}`}
                >
                  <div className="text-4xl mb-4">{product.emoji}</div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h2>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{product.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-xs text-gray-500">
                      {videos.length === 0
                        ? "No videos yet"
                        : `${videos.length} video${videos.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

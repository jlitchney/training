"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product { id: string; name: string; slug: string; description: string; color: string; emoji: string; }
interface Video { id: string; title: string; description: string; duration?: number; blobUrl?: string; }

const COLOR_MAP: Record<string, { bg: string; light: string; text: string; border: string }> = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  purple: { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  green:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  orange: { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  pink:   { bg: "bg-pink-600",   light: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-200" },
  teal:   { bg: "bg-teal-600",   light: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200" },
};
function col(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

function formatDuration(s?: number) {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function blobSrc(url: string) {
  if (url?.includes(".blob.vercel-storage.com")) return `/api/blob?url=${encodeURIComponent(url)}`;
  return url;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}&publishedOnly=true`).then((r) => r.json()),
      fetch(`/api/video-categories?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids, cats]: [Product[], Video[], Record<string, string>]) => {
      setProduct(prods.find((p) => p.slug === slug) ?? null);
      setVideos(vids);
      setCatMap(cats);
      setLoading(false);
    });
  }, [slug]);

  // Ordered category list preserving insertion order
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const video of videos) {
      const cat = catMap[video.id];
      if (cat && !seen.has(cat)) { seen.add(cat); order.push(cat); }
    }
    return order;
  }, [videos, catMap]);

  const query = search.trim().toLowerCase();

  // Flat search results across all categories
  const searchResults = useMemo(() => {
    if (!query) return [];
    return videos.filter((v) =>
      v.title.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query)
    );
  }, [videos, query]);

  // Per-category video lists (for category cards)
  const categoryVideos = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const video of videos) {
      const cat = catMap[video.id] ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(video);
    }
    return map;
  }, [videos, catMap]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Product not found.</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">← Back to home</Link>
    </div>
  );

  const c = col(product.color);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="hover:opacity-75 transition-opacity flex-shrink-0">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-6 w-auto" />
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700 truncate">{product.emoji} {product.name}</span>
        </div>
      </header>

      {/* Product identity */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
              {product.emoji}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${product.name} videos…`}
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No videos published yet.</p>
          </div>
        ) : query ? (
          /* Search results: flat video list */
          <div>
            <p className="text-sm text-gray-500 mb-6">
              {searchResults.length === 0
                ? `No results for "${search}"`
                : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"`}
            </p>
            <div className="space-y-2">
              {searchResults.map((v) => (
                <Link
                  key={v.id}
                  href={`/${slug}/${v.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg ${c.light} flex-shrink-0 flex items-center justify-center overflow-hidden`}>
                    {v.blobUrl ? (
                      <video src={blobSrc(v.blobUrl)} preload="metadata" muted className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-xs ${c.text}`}>▶</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">{v.title}</p>
                    {v.description && <p className="text-xs text-gray-400 truncate mt-0.5">{v.description}</p>}
                  </div>
                  {catMap[v.id] && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.light} ${c.text} font-medium flex-shrink-0`}>
                      {catMap[v.id]}
                    </span>
                  )}
                  {v.duration && (
                    <span className="text-xs text-gray-400 font-mono flex-shrink-0">{formatDuration(v.duration)}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Category cards */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const catVids = categoryVideos.get(cat) ?? [];
              const preview = catVids[0];
              return (
                <Link
                  key={cat}
                  href={`/${slug}/${encodeURIComponent(cat)}`}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group flex flex-col"
                >
                  {/* Preview thumbnail strip */}
                  <div className={`relative h-32 ${c.light} flex items-center justify-center overflow-hidden`}>
                    {preview?.blobUrl ? (
                      <video
                        src={blobSrc(preview.blobUrl)}
                        preload="metadata"
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className={`text-4xl opacity-30`}>{product.emoji}</span>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-2 right-2">
                      <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        {catVids.length} video{catVids.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${c.light} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-sm ${c.text}`}>▶</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {cat}
                      </h2>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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

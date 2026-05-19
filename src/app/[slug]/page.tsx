"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product { id: string; name: string; slug: string; description: string; color: string; emoji: string; }
interface Video { id: string; title: string; description: string; duration?: number; }

const COLOR_CLASSES: Record<string, { bg: string; border: string; searchBorder: string; searchFocus: string }> = {
  blue:   { bg: "bg-blue-600",   border: "border-blue-100",   searchBorder: "border-blue-300",   searchFocus: "focus:border-blue-400" },
  purple: { bg: "bg-purple-600", border: "border-purple-100", searchBorder: "border-purple-300", searchFocus: "focus:border-purple-400" },
  green:  { bg: "bg-green-600",  border: "border-green-100",  searchBorder: "border-green-300",  searchFocus: "focus:border-green-400" },
  orange: { bg: "bg-orange-500", border: "border-orange-100", searchBorder: "border-orange-300", searchFocus: "focus:border-orange-400" },
  pink:   { bg: "bg-pink-600",   border: "border-pink-100",   searchBorder: "border-pink-300",   searchFocus: "focus:border-pink-400" },
  teal:   { bg: "bg-teal-600",   border: "border-teal-100",   searchBorder: "border-teal-300",   searchFocus: "focus:border-teal-400" },
};

function colorFor(color: string) { return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue; }

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoCard({ video, slug, colorBg }: { video: Video; slug: string; colorBg: string; category?: string }) {
  return (
    <Link
      href={`/${slug}/${video.id}`}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${colorBg}`}>▶</div>
        {video.duration && <span className="text-xs text-gray-400">{formatDuration(video.duration)}</span>}
      </div>
      <h3 className="font-medium text-gray-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors">
        {video.title}
      </h3>
      {video.description && <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>}
    </Link>
  );
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

  const query = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!query) return [];
    return videos.filter((v) =>
      v.title.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query)
    );
  }, [videos, query]);

  // Groups of published videos by category, preserving insertion order
  const categoryGroups = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const video of videos) {
      const cat = catMap[video.id] ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(video);
    }
    return Array.from(map.entries()); // only categories with ≥1 published video
  }, [videos, catMap]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Product not found.</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Back to home</Link>
      </div>
    );
  }

  const c = colorFor(product.color);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/" className="hover:opacity-75 transition-opacity inline-block">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      {/* Product hero + search */}
      <div className={`${c.bg} text-white`}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-5xl mb-3">{product.emoji}</div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-white/80 text-sm max-w-xl mb-6">{product.description}</p>
          <div className="relative max-w-lg">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${product.name} videos…`}
              className={`w-full bg-white/15 placeholder-white/50 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm border ${c.searchBorder} ${c.searchFocus} focus:outline-none focus:bg-white/20`}
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No videos published yet.</div>
        ) : query ? (
          /* Search results */
          <div>
            <p className="text-sm text-gray-500 mb-6">
              {searchResults.length === 0
                ? `No results for "${search}"`
                : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"`}
            </p>
            {searchResults.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((video) => (
                  <VideoCard key={video.id} video={video} slug={slug} colorBg={c.bg} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Category sections */
          <div className="space-y-10">
            {categoryGroups.map(([cat, catVideos]) => (
              <section key={cat}>
                <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  {cat}
                  <span className="text-xs font-normal text-gray-400">{catVideos.length} video{catVideos.length !== 1 ? "s" : ""}</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catVideos.map((video) => (
                    <VideoCard key={video.id} video={video} slug={slug} colorBg={c.bg} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

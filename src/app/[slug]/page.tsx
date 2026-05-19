"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product { id: string; name: string; slug: string; description: string; color: string; emoji: string; }
interface Video { id: string; title: string; description: string; duration?: number; blobUrl?: string; }

const COLOR_MAP: Record<string, { bg: string; light: string; text: string; dot: string }> = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  purple: { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  green:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  orange: { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  pink:   { bg: "bg-pink-600",   light: "bg-pink-50",   text: "text-pink-700",   dot: "bg-pink-500" },
  teal:   { bg: "bg-teal-600",   light: "bg-teal-50",   text: "text-teal-700",   dot: "bg-teal-500" },
};
function c(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

function formatDuration(s?: number) {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function blobSrc(url: string) {
  if (url?.includes(".blob.vercel-storage.com")) return `/api/blob?url=${encodeURIComponent(url)}`;
  return url;
}

function VideoCard({ video, slug, color }: { video: Video; slug: string; color: string }) {
  const col = c(color);
  return (
    <Link
      href={`/${slug}/${video.id}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
    >
      {/* Thumbnail */}
      <div className={`relative aspect-video ${col.light} flex items-center justify-center overflow-hidden`}>
        {video.blobUrl ? (
          <video
            src={blobSrc(video.blobUrl)}
            preload="metadata"
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-12 h-12 rounded-full ${col.bg} flex items-center justify-center`}>
            <span className="text-white text-lg pl-0.5">▶</span>
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className={`text-base pl-0.5 ${col.text}`}>▶</span>
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-sm text-gray-500 line-clamp-2 flex-1">{video.description}</p>
        )}
      </div>
    </Link>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
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

  // Ordered list of categories that have ≥1 published video
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

  const visibleVideos = useMemo(() => {
    let list = videos;
    if (activeTab !== "All") list = list.filter((v) => catMap[v.id] === activeTab);
    if (query) list = list.filter((v) =>
      v.title.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query)
    );
    return list;
  }, [videos, catMap, activeTab, query]);

  // Group by category (only when "All" tab + no search)
  const grouped = useMemo(() => {
    if (activeTab !== "All" || query) return null;
    const map = new Map<string, Video[]>();
    for (const video of videos) {
      const cat = catMap[video.id] ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(video);
    }
    return map;
  }, [videos, catMap, activeTab, query]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Product not found.</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">← Back to home</Link>
    </div>
  );

  const col = c(product.color);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="hover:opacity-75 transition-opacity flex-shrink-0">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-6 w-auto" />
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700 truncate">{product.emoji} {product.name}</span>
        </div>
      </header>

      {/* Product identity + search */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl ${col.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
              {product.emoji}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="relative max-w-xl">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveTab("All"); }}
              placeholder={`Search ${product.name} videos…`}
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Category tabs */}
        {categories.length > 1 && !query && (
          <div className="max-w-5xl mx-auto px-6 pb-0 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {["All", ...categories].map((tab) => {
              const count = tab === "All" ? videos.length : videos.filter((v) => catMap[v.id] === tab).length;
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? `border-blue-600 ${col.text}`
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {tab}
                  <span className={`ml-1.5 text-xs ${active ? col.text : "text-gray-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No videos published yet.</p>
          </div>
        ) : query || activeTab !== "All" ? (
          /* Filtered flat view */
          <div>
            {query && (
              <p className="text-sm text-gray-500 mb-6">
                {visibleVideos.length === 0 ? `No results for "${search}"` : `${visibleVideos.length} result${visibleVideos.length !== 1 ? "s" : ""} for "${search}"`}
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleVideos.map((v) => <VideoCard key={v.id} video={v} slug={slug} color={product.color} />)}
            </div>
          </div>
        ) : (
          /* Category sections */
          <div className="space-y-10">
            {Array.from(grouped!.entries()).map(([cat, catVideos]) => (
              <section key={cat}>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-base font-semibold text-gray-900">{cat}</h2>
                  <span className="text-xs text-gray-400 font-normal">{catVideos.length} video{catVideos.length !== 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {catVideos.map((v) => <VideoCard key={v.id} video={v} slug={slug} color={product.color} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

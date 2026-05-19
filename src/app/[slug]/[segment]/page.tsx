"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// UUID pattern — determines whether this segment is a video ID or a category name
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Product { id: string; name: string; slug: string; description: string; color: string; emoji: string; }
interface Video { id: string; title: string; description: string; blobUrl: string; duration?: number; recordedAt: string; }

const COLOR_MAP: Record<string, { bg: string; light: string; text: string }> = {
  blue:   { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700" },
  purple: { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700" },
  green:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700" },
  orange: { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700" },
  pink:   { bg: "bg-pink-600",   light: "bg-pink-50",   text: "text-pink-700" },
  teal:   { bg: "bg-teal-600",   light: "bg-teal-50",   text: "text-teal-700" },
};
function col(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

function blobSrc(url: string) {
  if (url?.includes(".blob.vercel-storage.com")) return `/api/blob?url=${encodeURIComponent(url)}`;
  return url;
}
function formatDuration(s?: number) {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Shared video card ────────────────────────────────────────────────
function VideoCard({ video, slug, color }: { video: Video; slug: string; color: string }) {
  const c = col(color);
  return (
    <Link
      href={`/${slug}/${video.id}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
    >
      <div className={`relative aspect-video ${c.light} flex items-center justify-center overflow-hidden`}>
        <video src={blobSrc(video.blobUrl)} preload="metadata" muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className={`text-sm pl-0.5 ${c.text}`}>▶</span>
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
          {video.title}
        </h3>
        {video.description && <p className="text-sm text-gray-500 line-clamp-2 flex-1">{video.description}</p>}
      </div>
    </Link>
  );
}

// ── Category page ────────────────────────────────────────────────────
function CategoryView({ slug, category }: { slug: string; category: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}&publishedOnly=true`).then((r) => r.json()),
      fetch(`/api/video-categories?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids, cats]: [Product[], Video[], Record<string, string>]) => {
      setProduct(prods.find((p) => p.slug === slug) ?? null);
      setVideos(vids.filter((v) => cats[v.id] === category));
      setLoading(false);
    });
  }, [slug, category]);

  const query = search.trim().toLowerCase();
  const results = useMemo(() =>
    query ? videos.filter((v) =>
      v.title.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query)
    ) : videos,
    [videos, query]
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-gray-400">Not found.</div>;

  const c = col(product.color);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
          <Link href="/" className="hover:opacity-75 transition-opacity flex-shrink-0">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-6 w-auto" />
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={`/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors truncate">
            {product.emoji} {product.name}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800 truncate">{category}</span>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{category}</h1>
              <p className="text-sm text-gray-500">{videos.length} video{videos.length !== 1 ? "s" : ""} · {product.name}</p>
            </div>
          </div>

          <div className="relative max-w-xl">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${category} videos…`}
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {query && results.length === 0 ? (
          <p className="text-sm text-gray-400">No results for "{search}"</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((v) => <VideoCard key={v.id} video={v} slug={slug} color={product.color} />)}
          </div>
        )}
        {videos.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">No videos in this category yet.</div>
        )}
      </main>
    </div>
  );
}

// ── Video player page ────────────────────────────────────────────────
function VideoView({ slug, videoId }: { slug: string; videoId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}&publishedOnly=true`).then((r) => r.json()),
      fetch(`/api/video-categories?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids, cats]: [Product[], Video[], Record<string, string>]) => {
      const prod = prods.find((p) => p.slug === slug) ?? null;
      const vid = vids.find((v) => v.id === videoId) ?? null;
      const cat = cats[videoId] ?? null;
      const sameCategory = vids.filter((v) => v.id !== videoId && cats[v.id] === cat);
      setProduct(prod);
      setVideo(vid);
      setCategory(cat);
      setRelated(sameCategory.slice(0, 6));
      setLoading(false);
      if (!vid) setError(true);
    }).catch(() => { setLoading(false); setError(true); });
  }, [slug, videoId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (error || !video || !product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Video not found.</p>
      <Link href={`/${slug}`} className="text-blue-600 hover:underline text-sm">← Back to {product?.name ?? "product"}</Link>
    </div>
  );

  const c = col(product.color);
  const isVideo = /\.(webm|mp4|mov)$/i.test(video.blobUrl) || video.blobUrl.includes(".blob.");

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
            <img src="/logo-white.svg" alt="All-Star Training" className="h-7 w-auto" />
          </Link>
          <span className="text-gray-700">/</span>
          <Link href={`/${slug}`} className="text-sm text-gray-400 hover:text-white transition-colors">
            {product.emoji} {product.name}
          </Link>
          {category && (
            <>
              <span className="text-gray-700">/</span>
              <Link href={`/${slug}/${encodeURIComponent(category)}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                {category}
              </Link>
            </>
          )}
          <div className="flex-1" />
          <Link
            href={category ? `/${slug}/${encodeURIComponent(category)}` : `/${slug}`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-6">
            {isVideo
              ? <video src={blobSrc(video.blobUrl)} controls autoPlay={false} className="w-full h-full" />
              : <div className="text-gray-500 text-sm">Unsupported format</div>}
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white ${c.bg}`}>
              {product.emoji} {product.name}
            </div>
            {category && (
              <Link href={`/${slug}/${encodeURIComponent(category)}`}
                className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">
                {category}
              </Link>
            )}
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{video.title}</h1>
          {video.description && <p className="text-gray-400 text-sm leading-relaxed mb-4">{video.description}</p>}
          <p className="text-xs text-gray-600">Added {new Date(video.recordedAt).toLocaleDateString()}</p>
        </div>

        {related.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              More in {category ?? "this product"}
            </h2>
            <div className="space-y-3">
              {related.map((v) => (
                <Link key={v.id} href={`/${slug}/${v.id}`}
                  className="flex gap-3 p-3 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors group">
                  <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs ${c.bg}`}>▶</div>
                  <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-snug line-clamp-2">{v.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Route entry point ────────────────────────────────────────────────
export default function SegmentPage() {
  const { slug, segment } = useParams<{ slug: string; segment: string }>();
  if (UUID_RE.test(segment)) return <VideoView slug={slug} videoId={segment} />;
  return <CategoryView slug={slug} category={decodeURIComponent(segment)} />;
}

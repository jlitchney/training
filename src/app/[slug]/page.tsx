"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  description: string;
  duration?: number;
}

const COLOR_CLASSES: Record<string, { bg: string; border: string; pill: string; back: string }> = {
  blue:   { bg: "bg-blue-600",   border: "border-blue-100",   pill: "bg-blue-100 text-blue-700",    back: "text-blue-600" },
  purple: { bg: "bg-purple-600", border: "border-purple-100", pill: "bg-purple-100 text-purple-700", back: "text-purple-600" },
  green:  { bg: "bg-green-600",  border: "border-green-100",  pill: "bg-green-100 text-green-700",   back: "text-green-600" },
  orange: { bg: "bg-orange-500", border: "border-orange-100", pill: "bg-orange-100 text-orange-700", back: "text-orange-600" },
  pink:   { bg: "bg-pink-600",   border: "border-pink-100",   pill: "bg-pink-100 text-pink-700",     back: "text-pink-600" },
  teal:   { bg: "bg-teal-600",   border: "border-teal-100",   pill: "bg-teal-100 text-teal-700",     back: "text-teal-600" },
};

function colorFor(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids]: [Product[], Video[]]) => {
      setProduct(prods.find((p) => p.slug === slug) ?? null);
      setVideos(vids);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

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
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            ← All-Star Training
          </Link>
        </div>
      </header>

      {/* Product hero */}
      <div className={`${c.bg} text-white`}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-5xl mb-3">{product.emoji}</div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-white/80 text-sm max-w-xl">{product.description}</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No videos published yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/${slug}/${video.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm hover:border-gray-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg ${c.bg}`}>
                    ▶
                  </div>
                  {video.duration && (
                    <span className="text-xs text-gray-400">{formatDuration(video.duration)}</span>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

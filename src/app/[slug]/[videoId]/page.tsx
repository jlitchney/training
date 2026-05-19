"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  slug: string;
  color: string;
  emoji: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  blobUrl: string;
  duration?: number;
  recordedAt: string;
  tags?: string[];
}

function blobSrc(url: string) {
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const COLOR_CLASSES: Record<string, { bg: string }> = {
  blue:   { bg: "bg-blue-600" },
  purple: { bg: "bg-purple-600" },
  green:  { bg: "bg-green-600" },
  orange: { bg: "bg-orange-500" },
  pink:   { bg: "bg-pink-600" },
  teal:   { bg: "bg-teal-600" },
};

export default function VideoPage() {
  const { slug, videoId } = useParams<{ slug: string; videoId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids]: [Product[], Video[]]) => {
      const prod = prods.find((p) => p.slug === slug) ?? null;
      const vid = vids.find((v) => v.id === videoId) ?? null;
      setProduct(prod);
      setVideo(vid);
      setRelated(vids.filter((v) => v.id !== videoId).slice(0, 6));
      setLoading(false);
      if (!vid) setError(true);
    }).catch(() => { setLoading(false); setError(true); });
  }, [slug, videoId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  if (error || !video || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Video not found.</p>
        <Link href={`/${slug}`} className="text-blue-600 hover:underline text-sm">← Back to {product?.name ?? "product"}</Link>
      </div>
    );
  }

  const c = COLOR_CLASSES[product.color] ?? COLOR_CLASSES.blue;
  const isVideo = /\.(webm|mp4|mov)$/i.test(video.blobUrl) || video.blobUrl.includes(".blob.");

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">All-Star Training</Link>
          <span className="text-gray-700">/</span>
          <Link href={`/${slug}`} className="text-sm text-gray-400 hover:text-white transition-colors">
            {product.emoji} {product.name}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Main video */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-6">
            {isVideo ? (
              <video
                src={blobSrc(video.blobUrl)}
                controls
                autoPlay={false}
                className="w-full h-full"
              />
            ) : (
              <div className="text-gray-500 text-sm">Unsupported format</div>
            )}
          </div>

          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white mb-3 ${c.bg}`}>
            {product.emoji} {product.name}
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{video.title}</h1>
          {video.description && (
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{video.description}</p>
          )}
          <p className="text-xs text-gray-600">
            Added {new Date(video.recordedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Sidebar: related videos */}
        {related.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">More videos</h2>
            <div className="space-y-3">
              {related.map((v) => (
                <Link
                  key={v.id}
                  href={`/${slug}/${v.id}`}
                  className="flex gap-3 p-3 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs ${c.bg}`}>
                    ▶
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                      {v.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { renderIcon, renderIconColored } from "@/lib/renderIcon";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Product { id: string; name: string; slug: string; description: string; color: string; emoji: string; visibility?: "public" | "internal"; categoryVisibility?: Record<string, "public" | "internal">; }
interface Video { id: string; title: string; description: string; blobUrl: string; duration?: number; recordedAt: string; thumbnailUrl?: string; }
interface Article { id: string; title: string; description?: string; category?: string; articleContent: string; }

const COLOR_MAP: Record<string, { bg: string; light: string; text: string }> = {
  blue:    { bg: "bg-blue-600",    light: "bg-blue-50",    text: "text-blue-700" },
  indigo:  { bg: "bg-indigo-600",  light: "bg-indigo-50",  text: "text-indigo-700" },
  violet:  { bg: "bg-violet-600",  light: "bg-violet-50",  text: "text-violet-700" },
  purple:  { bg: "bg-purple-600",  light: "bg-purple-50",  text: "text-purple-700" },
  pink:    { bg: "bg-pink-600",    light: "bg-pink-50",    text: "text-pink-700" },
  rose:    { bg: "bg-rose-600",    light: "bg-rose-50",    text: "text-rose-700" },
  red:     { bg: "bg-red-600",     light: "bg-red-50",     text: "text-red-700" },
  orange:  { bg: "bg-orange-500",  light: "bg-orange-50",  text: "text-orange-700" },
  amber:   { bg: "bg-amber-500",   light: "bg-amber-50",   text: "text-amber-700" },
  lime:    { bg: "bg-lime-600",    light: "bg-lime-50",    text: "text-lime-700" },
  green:   { bg: "bg-green-600",   light: "bg-green-50",   text: "text-green-700" },
  emerald: { bg: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-700" },
  teal:    { bg: "bg-teal-600",    light: "bg-teal-50",    text: "text-teal-700" },
  cyan:    { bg: "bg-cyan-600",    light: "bg-cyan-50",    text: "text-cyan-700" },
  sky:     { bg: "bg-sky-500",     light: "bg-sky-50",     text: "text-sky-700" },
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


// ── Video thumbnail ──────────────────────────────────────────────────
function VideoThumbnail({ blobUrl, thumbnailUrl, color, duration, videoId, slug }: {
  blobUrl: string; thumbnailUrl?: string; color: string; duration?: number; videoId: string; slug: string;
}) {
  const c = col(color);
  const { data: session } = useSession();
  const [frame, setFrame] = useState<string | null>(thumbnailUrl ? blobSrc(thumbnailUrl) : null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const captureStarted = useRef(false);
  const saveStarted = useRef(false);

  // Effect 1: capture frame via Canvas on desktop
  useEffect(() => {
    if (frame || captureStarted.current) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    captureStarted.current = true;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = blobSrc(blobUrl);
    const timer = setTimeout(() => { video.src = ""; }, 8000);
    video.addEventListener("loadedmetadata", () => {
      const seekTo = isFinite(video.duration) ? Math.min(2, video.duration * 0.1) : 0.1;
      video.currentTime = seekTo || 0.1;
    });
    video.addEventListener("seeked", () => {
      clearTimeout(timer);
      const w = Math.min(video.videoWidth || 320, 640);
      const h = video.videoWidth > 0 ? Math.round(w * video.videoHeight / video.videoWidth) : 180;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { video.src = ""; return; }
      ctx.drawImage(video, 0, 0, w, h);
      setFrame(canvas.toDataURL("image/jpeg", 0.8));
      canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.8);
      video.src = "";
    });
    video.addEventListener("error", () => { clearTimeout(timer); });
  }, [blobUrl, frame]);

  // Effect 2: persist captured blob to DB once session is available
  // Runs independently so session loading after capture still triggers save
  useEffect(() => {
    if (!capturedBlob || thumbnailUrl || !session || saveStarted.current) return;
    saveStarted.current = true;
    upload(`thumb-${videoId}-${Date.now()}.jpg`, capturedBlob, { access: "private", handleUploadUrl: "/api/upload" })
      .then((result) => fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: slug, thumbnailUrl: result.url }),
      }))
      .catch(() => {});
  }, [capturedBlob, thumbnailUrl, session, videoId, slug]);

  return (
    <div className={`relative aspect-video ${c.light} flex items-center justify-center overflow-hidden`}>
      {frame ? (
        <img src={frame} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-white/80 group-hover:bg-white/95 group-hover:scale-105 transition-all flex items-center justify-center shadow-md">
          <span className={`text-base pl-0.5 ${c.text}`}>▶</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      {duration && (
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

// ── Share modal ──────────────────────────────────────────────────────
function ShareModal({ video, slug, category, productName, onClose }: {
  video: Video; slug: string; category: string; productName: string; onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSend() {
    if (!to) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/share-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, videoId: video.id, slug, category, message: message || undefined }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorDetail(body.detail ?? body.error ?? `HTTP ${res.status}`);
        setStatus("error");
      }
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">Share via email</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{video.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 mb-1">Email sent!</p>
            <p className="text-sm text-gray-500">Sent to {to}</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-600 hover:underline">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Add a message <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey, thought you'd find this useful…"
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            {status === "error" && (
              <p className="text-sm text-red-600">
                Something went wrong{errorDetail ? `: ${errorDetail}` : ""}. Please try again.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSend}
                disabled={!to || status === "sending"}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared video card ────────────────────────────────────────────────
function VideoCard({ video, slug, color, productName, category }: {
  video: Video; slug: string; color: string; productName?: string; category?: string;
}) {
  const c = col(color);
  const [showShare, setShowShare] = useState(false);

  return (
    <>
      {showShare && productName && category && (
        <ShareModal
          video={video} slug={slug} category={category}
          productName={productName} onClose={() => setShowShare(false)}
        />
      )}
      <Link
        href={`/${slug}/${video.id}`}
        className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
      >
        <VideoThumbnail blobUrl={video.blobUrl} thumbnailUrl={video.thumbnailUrl} color={color} duration={video.duration} videoId={video.id} slug={slug} />
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
            {video.title}
          </h3>
          {video.description && (
              <div className="text-sm text-gray-500 line-clamp-2 flex-1 [&_ul]:list-disc [&_ul]:pl-4 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: video.description }} />
            )}
          {productName && category && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShare(true); }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Share via email
              </button>
            </div>
          )}
        </div>
      </Link>
    </>
  );
}

// ── Article card ─────────────────────────────────────────────────────
function ArticleCard({ article, color }: { article: Article; color: string }) {
  const c = col(color);
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-4 p-5"
      >
        <div className={`w-10 h-10 rounded-xl ${c.light} flex items-center justify-center flex-shrink-0`}>
          <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 leading-snug ${c.text} group-hover:opacity-80 transition-colors`}>{article.title}</h3>
          {article.description && !open && (
            <p className="text-sm text-gray-400 mt-0.5 truncate">{article.description}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div
            className="pt-4 prose prose-sm max-w-none text-gray-700 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500"
            dangerouslySetInnerHTML={{ __html: article.articleContent }}
          />
        </div>
      )}
    </div>
  );
}

// ── Category page ────────────────────────────────────────────────────
function CategoryView({ slug, category }: { slug: string; category: string }) {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}&publishedOnly=true`).then((r) => r.json()),
      fetch(`/api/video-categories?productId=${slug}`).then((r) => r.json()),
      fetch(`/api/articles?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids, cats, arts]: [Product[], Video[], Record<string, string>, Article[]]) => {
      setProduct(prods.find((p) => p.slug === slug) ?? null);
      setVideos(vids.filter((v) => cats[v.id] === category));
      const artArr = Array.isArray(arts) ? arts : [];
      setArticles(artArr.filter((a) => (a.category?.trim() || "Uncategorized") === category));
      setLoading(false);
    });
  }, [slug, category]);

  const query = search.trim().toLowerCase();
  const results = useMemo(() =>
    query ? videos.filter((v) =>
      v.title.toLowerCase().includes(query) ||
      (v.description ?? "").replace(/<[^>]*>/g, " ").toLowerCase().includes(query)
    ) : videos,
    [videos, query]
  );
  const articleResults = useMemo(() =>
    query ? articles.filter((a) =>
      a.title.toLowerCase().includes(query) ||
      a.articleContent.replace(/<[^>]*>/g, " ").toLowerCase().includes(query)
    ) : articles,
    [articles, query]
  );

  if (loading || authStatus === "loading") return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/${slug}/${encodeURIComponent(category)}`)}`);
      return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
    }
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Not found.</div>;
  }
  // Category is explicitly internal — redirect unauthenticated users to login
  if (authStatus === "unauthenticated" && product.categoryVisibility?.[category] === "internal") {
    router.replace(`/login?callbackUrl=${encodeURIComponent(`/${slug}/${encodeURIComponent(category)}`)}`);
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  const c = col(product.color);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
          <Link href="/" className="hover:opacity-75 transition-opacity flex-shrink-0">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-6 w-auto" />
          </Link>
          <span className="text-gray-300">/</span>
          <Link href={`/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors truncate inline-flex items-center gap-1">
            {renderIconColored(product.emoji, "w-3.5 h-3.5 flex-shrink-0")} {product.name}
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
              <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name} – {category}</h1>
              <p className="text-sm text-gray-500">
                {[
                  videos.length > 0 ? `${videos.length} video${videos.length !== 1 ? "s" : ""}` : "",
                  articles.length > 0 ? `${articles.length} article${articles.length !== 1 ? "s" : ""}` : "",
                ].filter(Boolean).join(" · ") || "No content yet"}
              </p>
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
              placeholder={`Search ${category}…`}
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {query && results.length === 0 && articleResults.length === 0 ? (
          <p className="text-sm text-gray-400">No results for &ldquo;{search}&rdquo;</p>
        ) : (
          <>
            {articleResults.length > 0 && (
              <div>
                {!query && videos.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Articles</h2>
                )}
                <div className="space-y-3">
                  {articleResults.map((a) => <ArticleCard key={a.id} article={a} color={product.color} />)}
                </div>
              </div>
            )}
            {results.length > 0 && (
              <div>
                {!query && articles.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Videos</h2>
                )}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((v) => <VideoCard key={v.id} video={v} slug={slug} color={product.color} productName={product.name} category={category} />)}
                </div>
              </div>
            )}
          </>
        )}
        {videos.length === 0 && articles.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">No content in this category yet.</div>
        )}
      </main>
    </div>
  );
}

// ── Video player page ────────────────────────────────────────────────
function VideoView({ slug, videoId }: { slug: string; videoId: string }) {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/videos?productId=${slug}&publishedOnly=true`).then((r) => r.json()),
      fetch(`/api/video-categories?productId=${slug}`).then((r) => r.json()),
    ]).then(([prods, vids, cats]: [Product[], Video[], Record<string, string>]) => {
      const prod = prods.find((p) => p.slug === slug) ?? null;
      const vid = vids.find((v) => v.id === videoId) ?? null;
      const cat = cats[videoId] ?? null;
      const sameCategory = vids.filter((v) => cats[v.id] === cat);
      setProduct(prod);
      setVideo(vid);
      setActiveVideo(vid);
      setCategory(cat);
      setRelated(sameCategory);
      setLoading(false);
      if (!vid) setError(true);
    }).catch(() => { setLoading(false); setError(true); });
  }, [slug, videoId]);

  if (loading || authStatus === "loading") return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (error || !video || !product) {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/${slug}/${videoId}`)}`);
      return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Video not found.</p>
        <Link href={`/${slug}`} className="text-blue-600 hover:underline text-sm">← Back to {product?.name ?? "product"}</Link>
      </div>
    );
  }

  const c = col(product.color);
  const playing = activeVideo ?? video;
  const isVideo = /\.(webm|mp4|mov)$/i.test(playing.blobUrl) || playing.blobUrl.includes(".blob.");

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 min-w-0">
          <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
            <img src="/logo-white.svg" alt="All-Star Training" className="h-7 w-auto" />
          </Link>
          <span className="text-gray-700 flex-shrink-0">/</span>
          <Link href={`/${slug}`} className="text-sm text-gray-400 hover:text-white transition-colors flex-shrink-0 inline-flex items-center gap-1">
            {renderIconColored(product.emoji, "w-3.5 h-3.5 flex-shrink-0")} {product.name}
          </Link>
          {category && (
            <>
              <span className="text-gray-700 flex-shrink-0">/</span>
              <Link href={`/${slug}/${encodeURIComponent(category)}`} className="text-sm text-gray-400 hover:text-white transition-colors flex-shrink-0">
                {category}
              </Link>
            </>
          )}
          <span className="text-gray-700 flex-shrink-0 hidden md:block">/</span>
          <span className="text-sm text-gray-500 truncate min-w-0 hidden md:block">{playing.title}</span>
          <div className="flex-1" />
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-6">
            {isVideo
              ? <video key={playing.id} src={blobSrc(playing.blobUrl)} controls autoPlay={false} playsInline className="w-full h-full" />
              : <div className="text-gray-500 text-sm">Unsupported format</div>}
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white ${c.bg}`}>
              {renderIcon(product.emoji, "w-3.5 h-3.5")} {product.name}
            </div>
            {category && (
              <Link href={`/${slug}/${encodeURIComponent(category)}`}
                className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">
                {category}
              </Link>
            )}
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{playing.title}</h1>
          {playing.description && (
            <div className="text-gray-400 text-sm leading-relaxed mb-4 [&_ul]:list-disc [&_ul]:pl-4 [&_a]:text-blue-400 [&_a]:underline [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: playing.description }} />
          )}
          <p className="text-xs text-gray-600">Added {new Date(playing.recordedAt).toLocaleDateString()}</p>
        </div>

        {related.filter((v) => v.id !== playing.id).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              More in {category ?? "this product"}
            </h2>
            <div className="space-y-3">
              {related
                .filter((v) => v.id !== playing.id)
                .sort((a, b) => (a.id === video.id ? 1 : b.id === video.id ? -1 : 0))
                .slice(0, 6)
                .map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVideo(v)}
                  className={`w-full flex gap-3 p-3 rounded-lg transition-colors group text-left ${playing.id === v.id ? `${c.bg}` : "bg-gray-900 hover:bg-gray-800"}`}
                >
                  <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs ${playing.id === v.id ? "bg-white/20" : c.bg}`}>▶</div>
                  <p className={`text-sm leading-snug line-clamp-2 ${playing.id === v.id ? "text-white" : "text-gray-200 group-hover:text-white transition-colors"}`}>{v.title}</p>
                </button>
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

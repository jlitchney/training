"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { BRAND_ICONS, isBrandIcon } from "@/lib/brandIcons";

interface Product { id: string; name: string; slug: string; emoji: string; color: string }
interface ContentItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  videoId?: string;
  video?: { id: string; thumbnailUrl?: string; publishedAt?: string; contentUpdatedAt?: string };
  type?: "video" | "article";
  articleContent?: string;
  publishedAt?: string;
  contentUpdatedAt?: string;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function contentBadge(ci: ContentItem): "new" | "updated" | null {
  const cutoff = Date.now() - THIRTY_DAYS;
  const isArticle = ci.type === "article";
  const pub = isArticle ? ci.publishedAt : ci.video?.publishedAt;
  const upd = isArticle ? ci.contentUpdatedAt : ci.video?.contentUpdatedAt;
  if (!pub) return null;
  const pubMs = +new Date(pub);
  const updMs = upd ? +new Date(upd) : 0;
  if (updMs > pubMs + 86_400_000 && updMs > cutoff) return "updated";
  if (pubMs > cutoff) return "new";
  return null;
}
interface SelectedContent {
  productSlug: string;
  productName: string;
  itemId: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  contentUrl: string;
  type: "video" | "article";
}
interface GeneratedPosts {
  linkedin: string;
  instagram: string;
  facebook: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://training.allstartalent.us";

function ProductEmoji({ emoji }: { emoji: string }) {
  if (!isBrandIcon(emoji)) return <span>{emoji}</span>;
  const icon = BRAND_ICONS[emoji];
  if (!icon) return <span>{emoji.replace("brand:", "")}</span>;
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={icon.hex} style={{ flexShrink: 0 }}>
      <path d={icon.path} />
    </svg>
  );
}

const PLATFORMS = [
  {
    id: "linkedin" as const,
    label: "LinkedIn",
    color: "#0077B5",
    charLimit: 3000,
    shareUrl: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
  {
    id: "instagram" as const,
    label: "Instagram",
    color: "#E1306C",
    charLimit: 2200,
    shareUrl: null,
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: "facebook" as const,
    label: "Facebook",
    color: "#1877F2",
    charLimit: 63206,
    shareUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
] as const;

export default function SocialPostsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [productItems, setProductItems] = useState<Record<string, ContentItem[]>>({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<string | null>(null);
  const [recentOnly, setRecentOnly] = useState(false);

  const [selected, setSelected] = useState<SelectedContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [posts, setPosts] = useState<GeneratedPosts | null>(null);
  const [activeTab, setActiveTab] = useState<"linkedin" | "instagram" | "facebook">("linkedin");
  const [copied, setCopied] = useState<string | null>(null);
  const [socialImageTemplate, setSocialImageTemplate] = useState<number>(1);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u) return;
      if (u.role !== "admin") { router.push("/studio"); return; }
      setCurrentUser(u);
      fetch("/api/products").then((r) => r.json()).then(setProducts);
    });
  }, [router]);

  async function toggleProduct(product: Product) {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      return;
    }
    setExpandedProductId(product.id);
    if (!productItems[product.id]) {
      setLoadingItemsFor(product.id);
      try {
        const [checklistRes, videosRes] = await Promise.all([
          fetch(`/api/checklist?productId=${product.id}`),
          fetch(`/api/videos?productId=${product.id}`),
        ]);
        const items: ContentItem[] = await checklistRes.json();
        const videos: { id: string; thumbnailUrl?: string }[] = videosRes.ok ? await videosRes.json() : [];
        const videoById = new Map(videos.map((v) => [v.id, v]));

        const merged = items
          .filter((i) => (i.type === "article" && i.articleContent?.trim()) || i.videoId || i.video?.id)
          .map((i) => {
            const vid = i.video?.id ?? i.videoId;
            if (!vid) return i;
            const fullVideo = videoById.get(vid);
            if (!fullVideo) return i;
            return {
              ...i,
              video: {
                ...i.video,
                id: vid,
                thumbnailUrl: i.video?.thumbnailUrl ?? fullVideo.thumbnailUrl,
              },
            };
          });

        setProductItems((prev) => ({ ...prev, [product.id]: merged }));
      } finally {
        setLoadingItemsFor(null);
      }
    }
  }

  function selectItem(product: Product, item: ContentItem) {
    const isArticle = item.type === "article";
    const contentUrl = isArticle
      ? `${APP_URL}/${product.slug}/${encodeURIComponent(item.category ?? "")}`
      : `${APP_URL}/${product.slug}/${item.video?.id ?? item.videoId ?? item.id}`;
    setSelected({
      productSlug: product.slug,
      productName: product.name,
      itemId: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      thumbnailUrl: item.video?.thumbnailUrl,
      contentUrl,
      type: isArticle ? "article" : "video",
    });
    setPosts(null);
    setGenError("");
  }

  async function generatePosts() {
    if (!selected) return;
    setGenerating(true);
    setGenError("");
    setSocialImageTemplate(Math.floor(Math.random() * 4) + 1);
    try {
      const r = await fetch("/api/generate-social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title,
          description: selected.description,
          productName: selected.productName,
          category: selected.category,
          contentUrl: selected.contentUrl,
          type: selected.type,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        setGenError(d.error ?? "Generation failed");
        return;
      }
      const data: GeneratedPosts = await r.json();
      setPosts(data);
      setActiveTab("linkedin");
    } finally {
      setGenerating(false);
    }
  }

  async function copyPost(platformId: "linkedin" | "instagram" | "facebook") {
    if (!posts) return;
    await navigator.clipboard.writeText(posts[platformId]);
    setCopied(platformId);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!currentUser) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const activePlatform = PLATFORMS.find((p) => p.id === activeTab)!;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">Social Posts</span>
          </div>
          <UserMenu user={currentUser} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start gap-6">

          {/* Left: content picker */}
          <div className="w-64 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pick Content</p>
              <button
                onClick={() => setRecentOnly((v) => !v)}
                className={`flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                  recentOnly ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Recent
              </button>
            </div>
            <div className="space-y-1.5">
              {products.map((product) => {
                const items = productItems[product.id] ?? [];
                const isExpanded = expandedProductId === product.id;
                return (
                  <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleProduct(product)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      <ProductEmoji emoji={product.emoji} />
                      <span className="flex-1 text-left truncate">{product.name}</span>
                      <svg
                        className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {loadingItemsFor === product.id ? (
                          <p className="text-xs text-gray-400 px-3 py-2.5">Loading…</p>
                        ) : items.length === 0 ? (
                          <p className="text-xs text-gray-400 px-3 py-2.5">No content yet.</p>
                        ) : (
                          items
                            .filter((item) => !recentOnly || contentBadge(item) !== null)
                            .map((item) => {
                              const badge = contentBadge(item);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => selectItem(product, item)}
                                  className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 last:border-0 transition-colors flex items-start gap-2 ${
                                    selected?.itemId === item.id
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                                    item.type === "article" ? "bg-green-400" : "bg-blue-400"
                                  }`} />
                                  <span className="leading-tight flex-1">{item.title}</span>
                                  {badge === "new" && <span className="flex-shrink-0 font-semibold px-1 rounded bg-emerald-100 text-emerald-700">New</span>}
                                  {badge === "updated" && <span className="flex-shrink-0 font-semibold px-1 rounded bg-amber-100 text-amber-700">Upd</span>}
                                </button>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: generate + results */}
          <div className="flex-1 min-w-0 space-y-5">
            {!selected ? (
              <div className="flex items-center justify-center h-72 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <div className="text-center px-6">
                  <div className="flex justify-center gap-3 mb-4 text-gray-300">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Select a video or article from the left</p>
                  <p className="text-xs text-gray-400 mt-1">AI will generate a post for LinkedIn, Instagram, and Facebook</p>
                </div>
              </div>
            ) : (
              <>
                {/* Selected item card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                  {selected.thumbnailUrl ? (
                    <img
                      src={selected.thumbnailUrl.includes(".blob.vercel-storage.com")
                        ? `/api/blob?url=${encodeURIComponent(selected.thumbnailUrl)}`
                        : selected.thumbnailUrl}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        selected.type === "article" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {selected.type === "article" ? "Article" : "Video"}
                      </span>
                      <span className="text-xs text-gray-500">{selected.productName}</span>
                      {selected.category && <span className="text-xs text-gray-400">· {selected.category}</span>}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{selected.title}</p>
                    <a
                      href={selected.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
                    >
                      {selected.contentUrl}
                    </a>
                  </div>
                  <button
                    onClick={generatePosts}
                    disabled={generating}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {posts ? "Regenerate" : "Generate Posts"}
                      </>
                    )}
                  </button>
                </div>

                {genError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{genError}</p>
                )}

                {/* Generated posts */}
                {posts && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Branded social image panel */}
                    {(() => {
                      const socialImageUrl = `/api/social-image?title=${encodeURIComponent(selected.title)}&productName=${encodeURIComponent(selected.productName)}&thumbnailUrl=${encodeURIComponent(selected.thumbnailUrl ?? "")}&template=${socialImageTemplate}`;
                      return (
                        <div className="border-b border-gray-100 p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700">Post image</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSocialImageTemplate(t => (t % 4) + 1)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Design {socialImageTemplate}/4
                              </button>
                              <a
                                href={socialImageUrl}
                                download="social-image.png"
                                className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-md px-2.5 py-1 hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Save image
                              </a>
                            </div>
                          </div>
                          <img
                            src={socialImageUrl}
                            alt="Branded social image"
                            className="w-full rounded-lg border border-gray-200"
                            style={{ aspectRatio: "1200/630" }}
                          />
                          <p className="text-xs text-gray-400 mt-1.5">1200 × 630 px · attach when publishing each post</p>
                        </div>
                      );
                    })()}

                    {/* Platform tab bar */}
                    <div className="flex border-b border-gray-200">
                      {PLATFORMS.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => setActiveTab(platform.id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            activeTab === platform.id
                              ? "border-b-2 text-gray-900"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                          style={activeTab === platform.id ? { borderBottomColor: platform.color } : {}}
                        >
                          <span style={{ color: platform.color }}>{platform.icon}</span>
                          {platform.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-5">
                      <div className="relative">
                        <textarea
                          value={posts[activeTab]}
                          onChange={(e) =>
                            setPosts((prev) => prev ? { ...prev, [activeTab]: e.target.value } : prev)
                          }
                          rows={12}
                          className="w-full border border-gray-200 rounded-lg p-4 text-sm text-gray-800 leading-relaxed resize-y focus:outline-none focus:border-blue-400"
                        />
                        <span className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                          {posts[activeTab].length} / {activePlatform.charLimit.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {/* Copy button */}
                        <button
                          onClick={() => copyPost(activeTab)}
                          className={`flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors ${
                            copied === activeTab
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          {copied === activeTab ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy text
                            </>
                          )}
                        </button>

                        {/* Open platform button (LinkedIn + Facebook only) */}
                        {activePlatform.shareUrl && (
                          <a
                            href={activePlatform.shareUrl(selected.contentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: activePlatform.color }}
                          >
                            {activePlatform.icon}
                            Open {activePlatform.label}
                          </a>
                        )}

                        {activeTab === "instagram" && (
                          <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Save the image above, copy the text, then create a new post in the Instagram app
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

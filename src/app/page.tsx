"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { renderIcon } from "@/lib/renderIcon";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji: string;
  visibility?: "public" | "internal";
  folderId?: string;
}

interface Video {
  id: string;
  productId: string;
  title: string;
  description: string;
  duration?: number;
}

interface Folder {
  id: string;
  name: string;
  order: number;
}

const COLOR_CLASSES: Record<string, { bg: string; badge: string; dot: string }> = {
  blue:    { bg: "bg-blue-600",    badge: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  indigo:  { bg: "bg-indigo-600",  badge: "bg-indigo-100 text-indigo-700",   dot: "bg-indigo-500" },
  violet:  { bg: "bg-violet-600",  badge: "bg-violet-100 text-violet-700",   dot: "bg-violet-500" },
  purple:  { bg: "bg-purple-600",  badge: "bg-purple-100 text-purple-700",   dot: "bg-purple-500" },
  pink:    { bg: "bg-pink-600",    badge: "bg-pink-100 text-pink-700",       dot: "bg-pink-500" },
  rose:    { bg: "bg-rose-600",    badge: "bg-rose-100 text-rose-700",       dot: "bg-rose-500" },
  red:     { bg: "bg-red-600",     badge: "bg-red-100 text-red-700",         dot: "bg-red-500" },
  orange:  { bg: "bg-orange-500",  badge: "bg-orange-100 text-orange-700",   dot: "bg-orange-500" },
  amber:   { bg: "bg-amber-500",   badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  lime:    { bg: "bg-lime-600",    badge: "bg-lime-100 text-lime-700",       dot: "bg-lime-500" },
  green:   { bg: "bg-green-600",   badge: "bg-green-100 text-green-700",     dot: "bg-green-500" },
  emerald: { bg: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  teal:    { bg: "bg-teal-600",    badge: "bg-teal-100 text-teal-700",       dot: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-600",    badge: "bg-cyan-100 text-cyan-700",       dot: "bg-cyan-500" },
  sky:     { bg: "bg-sky-500",     badge: "bg-sky-100 text-sky-700",         dot: "bg-sky-400" },
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

function ProductCard({ product, videos }: { product: Product; videos: Video[] }) {
  const c = colorFor(product.color);
  return (
    <Link
      href={`/${product.slug}`}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0 text-white`}>
        {renderIcon(product.emoji, "w-7 h-7")}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
          <span className="text-xs text-gray-400">
            {videos.length === 0 ? "No videos yet" : `${videos.length} video${videos.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<Record<string, Video[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/folders").then((r) => r.json()),
    ])
      .then(async ([prods, folds]: [Product[], Folder[]]) => {
        setProducts(prods);
        setFolders(folds);
        const videoMap: Record<string, Video[]> = {};
        await Promise.all(
          prods.map(async (p) => {
            const res = await fetch(`/api/videos?productId=${p.id}&publishedOnly=true`);
            videoMap[p.id] = await res.json();
          })
        );
        setAllVideos(videoMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();

  // Search: flat video results across all products
  const searchResults: { product: Product; video: Video }[] = [];
  if (query) {
    for (const product of products) {
      for (const video of allVideos[product.id] ?? []) {
        if (
          video.title.toLowerCase().includes(query) ||
          (video.description ?? "").replace(/<[^>]*>/g, " ").toLowerCase().includes(query) ||
          product.name.toLowerCase().includes(query)
        ) {
          searchResults.push({ product, video });
        }
      }
    }
  }

  // Products with videos (only show products that have at least 1 published video)
  const withVideos = products.filter((p) => (allVideos[p.id] ?? []).length > 0);

  // Visible folders: only those that have at least one visible product with videos.
  // /api/products already strips internal products for non-logged-in users, so
  // a folder with all-internal topics will naturally have 0 products in this list.
  const visibleFolderIds = new Set(withVideos.map((p) => p.folderId).filter(Boolean) as string[]);
  const visibleFolders = folders.filter((f) => visibleFolderIds.has(f.id));

  const openFolder = folders.find((f) => f.id === openFolderId);
  const folderProducts = openFolderId ? withVideos.filter((p) => p.folderId === openFolderId) : [];
  const uncategorized = withVideos.filter((p) => !p.folderId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {openFolder ? (
              <>
                <button onClick={() => setOpenFolderId(null)} className="hover:opacity-75 transition-opacity">
                  <img src="/logo-black.svg" alt="All-Star Training" className="h-8 w-auto" />
                </button>
                <span className="text-gray-300">/</span>
                <button
                  onClick={() => setOpenFolderId(null)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
                >
                  Knowledge Base
                </button>
                <span className="text-gray-300 hidden sm:block">/</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  {openFolder.name}
                </span>
              </>
            ) : (
              <>
                <img src="/logo-black.svg" alt="All-Star Training" className="h-8 w-auto" />
                <span className="text-sm text-gray-400 hidden sm:block">Video Knowledge Base</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm">
                  Knowledge Base
                </span>
                <Link
                  href="/studio"
                  className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Recording Studio
                </Link>
              </div>
            )}
            {session?.user && (
              <UserMenu user={{ name: session.user.name ?? session.user.email ?? "", role: (session.user as { role?: string }).role ?? "admin" }} />
            )}
          </div>
        </div>
      </header>

      {/* Hero / search — only show on root view */}
      {!openFolder && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6 py-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">How can we help?</h1>
            <p className="text-gray-500 mb-8">Search our video library to learn how to use All-Star products.</p>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search videos…"
                className="w-full border border-gray-300 rounded-xl pl-12 pr-5 py-3 text-base shadow-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : query ? (
          /* ── Search results ── */
          <div>
            <p className="text-sm text-gray-500 mb-6">
              {searchResults.length === 0
                ? `No results for "${search}"`
                : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map(({ product, video }) => {
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
                      <p className="text-sm text-gray-500 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: video.description }} />
                    )}
                    {video.duration && (
                      <p className="text-xs text-gray-400 mt-2">{formatDuration(video.duration)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : openFolder ? (
          /* ── Folder view ── */
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setOpenFolderId(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{openFolder.name}</h2>
                <p className="text-sm text-gray-500">{folderProducts.length} topic{folderProducts.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {folderProducts.map((product) => (
                <ProductCard key={product.id} product={product} videos={allVideos[product.id] ?? []} />
              ))}
            </div>
          </div>
        ) : (
          /* ── Root view: folders + uncategorized ── */
          <div className="space-y-8">
            {/* Folder tiles */}
            {visibleFolders.length > 0 && (
              <div>
                {uncategorized.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Folders</h2>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleFolders.map((folder) => {
                    const count = withVideos.filter((p) => p.folderId === folder.id).length;
                    const emojis = withVideos
                      .filter((p) => p.folderId === folder.id)
                      .slice(0, 4)
                      .map((p) => p.emoji);
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setOpenFolderId(folder.id)}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group text-left flex items-center gap-4"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors flex-shrink-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                            {folder.name}
                          </h2>
                          <p className="text-xs text-gray-400 mt-0.5">{count} topic{count !== 1 ? "s" : ""}</p>
                          {emojis.length > 0 && (
                            <p className="text-sm mt-1.5 leading-none">{emojis.join(" ")}</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uncategorized topic cards */}
            {uncategorized.length > 0 && (
              <div>
                {visibleFolders.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Topics</h2>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {uncategorized.map((product) => (
                    <ProductCard key={product.id} product={product} videos={allVideos[product.id] ?? []} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

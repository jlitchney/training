"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { renderIconColored } from "@/lib/renderIcon";

interface Product { id: string; name: string; slug: string; color: string; emoji: string; visibility?: 'public' | 'internal'; categoryVisibility?: Record<string, 'public' | 'internal'>; }
interface EmbeddedVideo { id: string; title: string; published: boolean; }
interface ChecklistItem { id: string; title: string; category?: string; videoId?: string; video?: EmbeddedVideo; }

const COLOR_MAP: Record<string, { bg: string; iconBg: string; iconText: string; bar: string }> = {
  blue:    { bg: "bg-blue-600",    iconBg: "bg-blue-50",    iconText: "text-blue-600",    bar: "bg-blue-500" },
  indigo:  { bg: "bg-indigo-600",  iconBg: "bg-indigo-50",  iconText: "text-indigo-600",  bar: "bg-indigo-500" },
  violet:  { bg: "bg-violet-600",  iconBg: "bg-violet-50",  iconText: "text-violet-600",  bar: "bg-violet-500" },
  purple:  { bg: "bg-purple-600",  iconBg: "bg-purple-50",  iconText: "text-purple-600",  bar: "bg-purple-500" },
  pink:    { bg: "bg-pink-600",    iconBg: "bg-pink-50",    iconText: "text-pink-600",    bar: "bg-pink-500" },
  rose:    { bg: "bg-rose-600",    iconBg: "bg-rose-50",    iconText: "text-rose-600",    bar: "bg-rose-500" },
  red:     { bg: "bg-red-600",     iconBg: "bg-red-50",     iconText: "text-red-600",     bar: "bg-red-500" },
  orange:  { bg: "bg-orange-500",  iconBg: "bg-orange-50",  iconText: "text-orange-600",  bar: "bg-orange-500" },
  amber:   { bg: "bg-amber-500",   iconBg: "bg-amber-50",   iconText: "text-amber-600",   bar: "bg-amber-500" },
  lime:    { bg: "bg-lime-600",    iconBg: "bg-lime-50",    iconText: "text-lime-600",    bar: "bg-lime-500" },
  green:   { bg: "bg-green-600",   iconBg: "bg-green-50",   iconText: "text-green-600",   bar: "bg-green-500" },
  emerald: { bg: "bg-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-600", bar: "bg-emerald-500" },
  teal:    { bg: "bg-teal-600",    iconBg: "bg-teal-50",    iconText: "text-teal-600",    bar: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-600",    iconBg: "bg-cyan-50",    iconText: "text-cyan-600",    bar: "bg-cyan-500" },
  sky:     { bg: "bg-sky-500",     iconBg: "bg-sky-50",     iconText: "text-sky-500",     bar: "bg-sky-400" },
};
function col(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

export default function StudioProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatVisibility, setNewCatVisibility] = useState<'public' | 'internal'>("public");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch(`/api/checklist?productId=${slug}`).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [prods, chk] = results as [Product[], ChecklistItem[]];
        setProduct(prods.find((p) => p.slug === slug) ?? null);
        setChecklist(chk);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [slug, router]);

  const categories = useMemo(() => {
    const map = new Map<string, { total: number; covered: number; drafts: number }>();
    for (const item of checklist) {
      const cat = item.category?.trim() || "Uncategorized";
      const cur = map.get(cat) ?? { total: 0, covered: 0, drafts: 0 };
      const hasDraft = !!item.videoId && !item.video?.published;
      map.set(cat, {
        total: cur.total + 1,
        covered: cur.covered + (item.videoId ? 1 : 0),
        drafts: cur.drafts + (hasDraft ? 1 : 0),
      });
    }
    return map;
  }, [checklist]);

  const totalCovered = checklist.filter((i) => i.videoId).length;

  const draftItems = useMemo(
    () => checklist.filter((i) => i.videoId && i.video && !i.video.published),
    [checklist]
  );

  async function publishVideo(item: ChecklistItem) {
    if (!item.video) return;
    setPublishingId(item.video.id);
    try {
      const res = await fetch(`/api/videos/${item.video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: slug, published: true }),
      });
      if (res.ok) {
        setChecklist((prev) => prev.map((i) =>
          i.video?.id === item.video!.id ? { ...i, video: { ...i.video!, published: true } } : i
        ));
      }
    } finally {
      setPublishingId(null);
    }
  }

  async function toggleCategoryVisibility(cat: string) {
    const current = product?.categoryVisibility?.[cat] ?? "public";
    const next = current === "internal" ? "public" : "internal";
    const newCatViz = { ...(product?.categoryVisibility ?? {}), [cat]: next } as Record<string, 'public' | 'internal'>;
    setProduct((prev) => prev ? { ...prev, categoryVisibility: newCatViz } : null);
    const res = await fetch(`/api/products/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryVisibility: newCatViz }),
    });
    if (!res.ok) {
      setProduct((prev) => prev ? { ...prev, categoryVisibility: product?.categoryVisibility ?? {} } : null);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const c = col(product?.color ?? "blue");

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (newCatVisibility === "internal") {
      const newCatViz = { ...(product?.categoryVisibility ?? {}), [name]: "internal" } as Record<string, 'public' | 'internal'>;
      setProduct((prev) => prev ? { ...prev, categoryVisibility: newCatViz } : null);
      await fetch(`/api/products/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryVisibility: newCatViz }),
      });
    }
    router.push(`/studio/${slug}/${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Recording Studio</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900 text-sm inline-flex items-center gap-1.5">{product ? renderIconColored(product.emoji, "w-4 h-4 flex-shrink-0") : null} {product?.name}</span>
          </div>
          {user && <UserMenu user={user} />}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-0.5">Categories</h1>
            <p className="text-sm text-gray-500">
              {checklist.length === 0
                ? "No items yet — create a category to get started."
                : `${totalCovered} of ${checklist.length} items covered across ${categories.size} ${categories.size === 1 ? "category" : "categories"}`}
            </p>
          </div>
          <button
            onClick={() => { setShowNewCat(true); setNewCatName(""); setNewCatVisibility("public"); }}
            className={`text-sm font-medium text-white rounded-lg px-4 py-2 transition-colors flex-shrink-0 ${c.bg}`}
          >
            + New Category
          </button>
        </div>

        {showNewCat && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Workflows"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); if (e.key === "Escape") setShowNewCat(false); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewCatVisibility("public")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${newCatVisibility === "public" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  🌐 Public
                </button>
                <button
                  type="button"
                  onClick={() => setNewCatVisibility("internal")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${newCatVisibility === "internal" ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  🔒 Internal
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleCreateCategory} disabled={!newCatName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
                Create
              </button>
              <button onClick={() => setShowNewCat(false)}
                className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {categories.size === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-500 font-medium mb-1">No categories yet</p>
            <p className="text-sm text-gray-400 mb-4">Create a category to start organizing your recordings.</p>
            <button onClick={() => setShowNewCat(true)} className="text-blue-600 hover:underline text-sm">
              + Create your first category
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from(categories.entries()).map(([cat, { total, covered, drafts }]) => {
              const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
              const complete = pct === 100 && total > 0 && drafts === 0;
              return (
                <Link
                  key={cat}
                  href={`/studio/${slug}/${encodeURIComponent(cat)}`}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group flex items-center gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <svg className={`w-5 h-5 ${c.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-tight">{cat}</h2>
                      {complete && <span className="text-sm flex-shrink-0">✅</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {product?.visibility === "internal" ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-600" title="Restricted by product visibility">
                          🔒 via product
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCategoryVisibility(cat); }}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                            (product?.categoryVisibility?.[cat] ?? "public") === "internal"
                              ? "bg-amber-50 border-amber-200 text-amber-600"
                              : "border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {(product?.categoryVisibility?.[cat] ?? "public") === "internal" ? "🔒 Internal" : "🌐 Public"}
                        </button>
                      )}
                      {drafts > 0 && (
                        <span className="text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">
                          {drafts} draft
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5">
                      <div
                        className={`h-1 rounded-full transition-all ${complete ? "bg-green-500" : c.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {covered}/{total} covered{pct > 0 && !complete ? ` · ${pct}%` : ""}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}

        {draftItems.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-yellow-500">🟡</span>
              Drafts pending publish ({draftItems.length})
            </h2>
            <div className="bg-white rounded-xl border border-yellow-200 divide-y divide-gray-100 overflow-hidden">
              {draftItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.video!.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.category ?? "Uncategorized"} · {item.title}
                    </p>
                  </div>
                  <button
                    onClick={() => publishVideo(item)}
                    disabled={publishingId === item.video!.id}
                    className="flex-shrink-0 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {publishingId === item.video!.id ? "Publishing…" : "Publish"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

interface Product { id: string; name: string; slug: string; color: string; emoji: string; }
interface ChecklistItem { id: string; category?: string; videoId?: string; }

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-green-600",
  orange: "bg-orange-500", pink: "bg-pink-600", teal: "bg-teal-600",
};
const COLOR_LIGHT: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200", purple: "bg-purple-50 border-purple-200",
  green: "bg-green-50 border-green-200", orange: "bg-orange-50 border-orange-200",
  pink: "bg-pink-50 border-pink-200", teal: "bg-teal-50 border-teal-200",
};
const COLOR_BAR: Record<string, string> = {
  blue: "bg-blue-500", purple: "bg-purple-500", green: "bg-green-500",
  orange: "bg-orange-500", pink: "bg-pink-500", teal: "bg-teal-500",
};

export default function StudioProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

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
    const map = new Map<string, { total: number; covered: number }>();
    for (const item of checklist) {
      const cat = item.category?.trim() || "Uncategorized";
      const cur = map.get(cat) ?? { total: 0, covered: 0 };
      map.set(cat, { total: cur.total + 1, covered: cur.covered + (item.videoId ? 1 : 0) });
    }
    return map;
  }, [checklist]);

  const totalCovered = checklist.filter((i) => i.videoId).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const colorBg = COLOR_BG[product?.color ?? "blue"] ?? "bg-blue-600";
  const colorLight = COLOR_LIGHT[product?.color ?? "blue"] ?? "bg-blue-50 border-blue-200";
  const colorBar = COLOR_BAR[product?.color ?? "blue"] ?? "bg-blue-500";

  function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    router.push(`/studio/${slug}/${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Studio</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900 text-sm">{product?.emoji} {product?.name}</span>
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
            onClick={() => { setShowNewCat(true); setNewCatName(""); }}
            className={`text-sm font-medium text-white rounded-lg px-4 py-2 transition-colors flex-shrink-0 ${colorBg}`}
          >
            + New Category
          </button>
        </div>

        {showNewCat && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex gap-3 items-end">
            <div className="flex-1">
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
            <button onClick={handleCreateCategory} disabled={!newCatName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
              Create
            </button>
            <button onClick={() => setShowNewCat(false)}
              className="border border-gray-300 text-gray-600 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(categories.entries()).map(([cat, { total, covered }]) => {
              const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
              const complete = pct === 100 && total > 0;
              return (
                <Link
                  key={cat}
                  href={`/studio/${slug}/${encodeURIComponent(cat)}`}
                  className={`rounded-xl border p-5 hover:shadow-md transition-all block ${colorLight}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="font-semibold text-gray-900 leading-snug">{cat}</h2>
                    {complete && <span className="text-base flex-shrink-0 ml-2">✅</span>}
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5 mb-2.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${complete ? "bg-green-500" : colorBar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{covered} / {total} covered</span>
                    {pct > 0 && !complete && <span className="text-gray-400">{pct}%</span>}
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

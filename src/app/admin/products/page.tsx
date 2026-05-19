"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji: string;
}

const COLORS = ["blue", "purple", "green", "orange", "pink", "teal"];
const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-500", purple: "bg-purple-500", green: "bg-green-500",
  orange: "bg-orange-500", pink: "bg-pink-500", teal: "bg-teal-500",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u || u.role !== "admin") { router.push("/studio"); return; }
      return fetch("/api/products").then((r) => r.json());
    }).then((prods?: Product[]) => {
      if (!prods) return;
      setProducts(prods);
      setLoading(false);
    });
  }, [router]);

  async function handleAddProduct() {
    if (!newName || !newSlug) return;
    setAdding(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug, description: newDesc, color: newColor, emoji: newEmoji }),
      });
      if (res.ok) {
        const product: Product = await res.json();
        setProducts((prev) => [...prev, product]);
        setShowAdd(false);
        setNewName(""); setNewSlug(""); setNewDesc(""); setNewColor("blue"); setNewEmoji("⭐");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await fetch(`/api/products/${product.slug}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Products</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Products</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add Product
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{product.emoji}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.slug} · {product.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[product.color] ?? COLOR_DOT.blue}`} />
                <Link
                  href={`/studio/${product.slug}`}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Studio →
                </Link>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3">
            <h3 className="font-medium text-gray-900 text-sm">New Product</h3>
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Slug (e.g. my-product)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Color</label>
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emoji</label>
                <input
                  type="text"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-16 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProduct}
                disabled={adding || !newName || !newSlug}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                {adding ? "Adding…" : "Add Product"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

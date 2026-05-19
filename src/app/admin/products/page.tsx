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
  order: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  videoId?: string;
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Add product form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const [adding, setAdding] = useState(false);

  // Add checklist item
  const [newItemTitle, setNewItemTitle] = useState("");

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

  async function loadChecklist(product: Product) {
    setSelectedProduct(product);
    const res = await fetch(`/api/checklist?productId=${product.id}`);
    setChecklist(await res.json());
  }

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
    if (selectedProduct?.id === product.id) setSelectedProduct(null);
  }

  async function handleAddChecklistItem() {
    if (!newItemTitle.trim() || !selectedProduct) return;
    const res = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "add", productId: selectedProduct.id, title: newItemTitle }),
    });
    if (res.ok) {
      const item: ChecklistItem = await res.json();
      setChecklist((prev) => [...prev, item]);
      setNewItemTitle("");
    }
  }

  async function handleDeleteChecklistItem(itemId: string) {
    if (!selectedProduct) return;
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete", productId: selectedProduct.id, itemId }),
    });
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Products</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-8">
        {/* Product list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Products</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              + Add Product
            </button>
          </div>

          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                  selectedProduct?.id === product.id ? "border-blue-400 shadow-sm" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => loadChecklist(product)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{product.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[product.color] ?? COLOR_DOT.blue}`} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add product form */}
          {showAdd && (
            <div className="mt-4 bg-white rounded-xl border border-blue-200 p-4 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">New Product</h3>
              <input
                type="text" placeholder="Name" value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text" placeholder="Slug (e.g. my-product)" value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text" placeholder="Description" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <select value={newColor} onChange={(e) => setNewColor(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Emoji</label>
                  <input type="text" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-16 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddProduct} disabled={adding || !newName || !newSlug}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                  {adding ? "Adding…" : "Add Product"}
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Checklist panel */}
        <div>
          {selectedProduct ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{selectedProduct.emoji}</span>
                <h2 className="font-semibold text-gray-900">{selectedProduct.name} — Recording Checklist</h2>
              </div>
              <div className="space-y-2 mb-4">
                {checklist.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${item.videoId ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
                    <span>{item.videoId ? "✅" : "⬜"}</span>
                    <span className={`flex-1 ${item.videoId ? "text-green-800" : "text-gray-700"}`}>{item.title}</span>
                    <button onClick={() => handleDeleteChecklistItem(item.id)} className="text-xs text-gray-400 hover:text-red-600 transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No items yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" placeholder="New checklist item…" value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={handleAddChecklistItem} disabled={!newItemTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors">
                  Add
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400 py-20">
              ← Select a product to manage its checklist
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

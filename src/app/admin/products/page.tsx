"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji: string;
  visibility?: 'public' | 'internal';
}

const COLORS: { name: string; swatch: string }[] = [
  { name: "blue",    swatch: "bg-blue-600" },
  { name: "indigo",  swatch: "bg-indigo-600" },
  { name: "violet",  swatch: "bg-violet-600" },
  { name: "purple",  swatch: "bg-purple-600" },
  { name: "pink",    swatch: "bg-pink-600" },
  { name: "rose",    swatch: "bg-rose-600" },
  { name: "red",     swatch: "bg-red-600" },
  { name: "orange",  swatch: "bg-orange-500" },
  { name: "amber",   swatch: "bg-amber-500" },
  { name: "lime",    swatch: "bg-lime-600" },
  { name: "green",   swatch: "bg-green-600" },
  { name: "emerald", swatch: "bg-emerald-600" },
  { name: "teal",    swatch: "bg-teal-600" },
  { name: "cyan",    swatch: "bg-cyan-600" },
  { name: "sky",     swatch: "bg-sky-500" },
];

const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-500", indigo: "bg-indigo-500", violet: "bg-violet-500",
  purple: "bg-purple-500", pink: "bg-pink-500", rose: "bg-rose-500",
  red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500",
  lime: "bg-lime-500", green: "bg-green-500", emerald: "bg-emerald-500",
  teal: "bg-teal-500", cyan: "bg-cyan-500", sky: "bg-sky-400",
};

const EMOJIS = [
  // Stars & celebration
  "⭐","🌟","💫","✨","🏆","🥇","🎖️","🎯","🎉","🎊",
  // Positive / status
  "✅","💡","🔥","🚀","💎","🆙","🔝","💯","⚡","🌈",
  // Work & business
  "💼","📊","📈","📉","📋","📝","🗂️","📁","📂","🗃️",
  // Tech & devices
  "💻","🖥️","📱","⌨️","🖱️","🖨️","📡","🔋","💾","🖲️",
  // Communication
  "📣","📢","💬","🗣️","📞","☎️","📧","📨","📩","📮",
  // Documents & learning
  "📖","📚","📰","🗞️","🔖","📜","🎓","🏫","✏️","🖊️",
  // Tools & building
  "⚙️","🔧","🔨","🛠️","🔩","🔑","🗝️","🔒","🛡️","🔬",
  // People & roles
  "👥","👤","🤝","👔","🙋","🧑‍💼","🧑‍🎓","🧑‍🏫","🧑‍🔬","🧑‍💻",
  // Health & wellness
  "❤️","💪","🧠","👁️","🩺","💊","🏥","🧘","🏃","🌡️",
  // Finance & growth
  "💰","💵","💳","🏦","📦","🛒","🤑","💹","🪙","📤",
  // Nature & environment
  "🌿","🍀","🌱","🌲","🌍","🌐","☀️","🌙","⛅","🌊",
  // Animals
  "🦁","🦊","🐺","🦅","🦋","🐝","🦄","🐉","🦈","🦉",
  // Buildings & places
  "🏢","🏬","🏛️","🏗️","🏠","🏪","🗼","🗺️","🌆","🌉",
  // Transport
  "🚗","✈️","🚂","🚀","🛸","🚁","⛵","🚢","🏎️","🛵",
  // Food & drink
  "☕","🍎","🍕","🎂","🍺","🥂","🍜","🥗","🍔","🧃",
  // Art & media
  "🎨","🎭","🎬","🎵","🎸","🎤","📸","🖼️","🎮","🎲",
  // Symbols & misc
  "🧩","♟️","🔮","🪄","🧲","📌","📍","🗓️","⏰","🔔",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map(({ name, swatch }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          title={name}
          className={`w-7 h-7 rounded-full ${swatch} flex items-center justify-center transition-transform hover:scale-110 ${
            value === name ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
          }`}
        >
          {value === name && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-xl border border-gray-300 bg-gray-50 flex items-center justify-center text-2xl hover:border-blue-400 transition-colors"
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 top-14 z-20 bg-white rounded-xl border border-gray-200 shadow-lg p-3 w-80 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-10 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center hover:bg-gray-100 transition-colors ${value === emoji ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FormState { name: string; slug: string; description: string; color: string; emoji: string; visibility: 'public' | 'internal'; }
const BLANK: FormState = { name: "", slug: "", description: "", color: "blue", emoji: "⭐", visibility: "public" };

function ProductForm({
  initial,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
      <h3 className="font-medium text-gray-900 text-sm">{isNew ? "New Product" : "Edit Product"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Name"
          value={f.name}
          onChange={(e) => {
            const name = e.target.value;
            setF((prev) => ({
              ...prev,
              name,
              slug: isNew ? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : prev.slug,
            }));
          }}
          className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <input
          type="text"
          placeholder="Slug (e.g. my-product)"
          value={f.slug}
          onChange={(e) => set("slug")(e.target.value)}
          disabled={!isNew}
          className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <input
          type="text"
          placeholder="Description"
          value={f.description}
          onChange={(e) => set("description")(e.target.value)}
          className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Color</label>
        <ColorPicker value={f.color} onChange={set("color")} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Icon</label>
        <EmojiPicker value={f.emoji} onChange={set("emoji")} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Visibility</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("visibility")("public")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${f.visibility === "public" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            🌐 Public
          </button>
          <button
            type="button"
            onClick={() => set("visibility")("internal")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${f.visibility === "internal" ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            🔒 Internal
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(f)}
          disabled={saving || !f.name || !f.slug}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          {saving ? "Saving…" : isNew ? "Add Product" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u || u.role !== "admin") { router.push("/studio"); return; }
      setUser(u);
      return fetch("/api/products").then((r) => r.json());
    }).then((prods?: Product[]) => {
      if (!prods) return;
      setProducts(prods);
      setLoading(false);
    });
  }, [router]);

  async function handleAdd(f: FormState) {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (res.ok) {
        const product: Product = await res.json();
        setProducts((prev) => [...prev, product]);
        setShowAdd(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(product: Product, f: FormState) {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, description: f.description, color: f.color, emoji: f.emoji, visibility: f.visibility }),
      });
      if (res.ok) {
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await fetch(`/api/products/${product.slug}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">Products</span>
          </div>
          {user && <UserMenu user={user} />}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Products</h2>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add Product
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {products.map((product) =>
            editingId === product.id ? (
              <ProductForm
                key={product.id}
                isNew={false}
                initial={{ name: product.name, slug: product.slug, description: product.description, color: product.color, emoji: product.emoji, visibility: product.visibility ?? "public" }}
                onSave={(f) => handleEdit(product, f)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{product.emoji}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.slug} · {product.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${(product.visibility ?? "public") === "internal" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {(product.visibility ?? "public") === "internal" ? "🔒 Internal" : "🌐 Public"}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[product.color] ?? "bg-blue-500"}`} />
                  <button
                    onClick={() => { setEditingId(product.id); setShowAdd(false); }}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {showAdd && (
          <ProductForm
            isNew
            initial={BLANK}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        )}
      </main>
    </div>
  );
}

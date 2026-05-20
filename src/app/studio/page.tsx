"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { renderIcon } from "@/lib/renderIcon";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  emoji: string;
  visibility?: "public" | "internal";
  order: number;
}

interface Video {
  id: string;
  title: string;
  published: boolean;
}

const COLOR_CLASSES: Record<string, { bg: string; dot: string }> = {
  blue:    { bg: "bg-blue-600",    dot: "bg-blue-500" },
  indigo:  { bg: "bg-indigo-600",  dot: "bg-indigo-500" },
  violet:  { bg: "bg-violet-600",  dot: "bg-violet-500" },
  purple:  { bg: "bg-purple-600",  dot: "bg-purple-500" },
  pink:    { bg: "bg-pink-600",    dot: "bg-pink-500" },
  rose:    { bg: "bg-rose-600",    dot: "bg-rose-500" },
  red:     { bg: "bg-red-600",     dot: "bg-red-500" },
  orange:  { bg: "bg-orange-500",  dot: "bg-orange-500" },
  amber:   { bg: "bg-amber-500",   dot: "bg-amber-500" },
  lime:    { bg: "bg-lime-600",    dot: "bg-lime-500" },
  green:   { bg: "bg-green-600",   dot: "bg-green-500" },
  emerald: { bg: "bg-emerald-600", dot: "bg-emerald-500" },
  teal:    { bg: "bg-teal-600",    dot: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-600",    dot: "bg-cyan-500" },
  sky:     { bg: "bg-sky-500",     dot: "bg-sky-400" },
};

function colorFor(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

function SortableCard({ product, videos }: { product: Product; videos: Video[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const published = videos.filter((v) => v.published).length;
  const total = videos.length;
  const c = colorFor(product.color);
  const isInternal = product.visibility === "internal";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/drag ${isDragging ? "opacity-50 z-50 shadow-2xl scale-[1.02]" : ""}`}
    >
      {/* Drag handle — appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-500 hover:bg-gray-100"
        title="Drag to reorder"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5.5" cy="3.5" r="1.2"/><circle cx="10.5" cy="3.5" r="1.2"/>
          <circle cx="5.5" cy="8"   r="1.2"/><circle cx="10.5" cy="8"   r="1.2"/>
          <circle cx="5.5" cy="12.5" r="1.2"/><circle cx="10.5" cy="12.5" r="1.2"/>
        </svg>
      </div>

      <Link
        href={`/studio/${product.slug}`}
        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group flex items-start gap-4"
      >
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0 text-white`}>
          {renderIcon(product.emoji, "w-7 h-7")}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
              {total} video{total !== 1 ? "s" : ""}
            </span>
            {published > 0 && (
              <span className="text-green-600 font-medium">{published} published</span>
            )}
            {isInternal && (
              <span className="ml-auto text-amber-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Internal
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [videoMap, setVideoMap] = useState<Record<string, Video[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) { router.push("/login"); return null; }
        return r.json();
      })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return fetch("/api/products").then((r) => r.json());
      })
      .then(async (prods?: Product[]) => {
        if (!prods) return;
        setProducts(prods);
        const map: Record<string, Video[]> = {};
        await Promise.all(
          prods.map(async (p) => {
            const res = await fetch(`/api/videos?productId=${p.id}`);
            map[p.id] = await res.json();
          })
        );
        setVideoMap(map);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex).map((p, i) => ({ ...p, order: i + 1 }));
    setProducts(reordered);

    // Persist changed order values
    reordered.forEach((p, i) => {
      if (products[i]?.id !== p.id) {
        fetch(`/api/products/${p.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: p.order }),
        });
      }
    });
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  const query = search.trim().toLowerCase();
  const visibleProducts = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
    : products;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link
                href="/"
                className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors"
              >
                Knowledge Base
              </Link>
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm">
                Recording Studio
              </span>
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a topic to record</h1>
          <p className="text-sm text-gray-500">Select a topic to see its recording checklist and upload videos.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
        </div>

        {visibleProducts.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No topics match "{search}"</p>
        ) : query ? (
          // Search results — plain grid, no drag
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const videos = videoMap[product.id] ?? [];
              const published = videos.filter((v) => v.published).length;
              const total = videos.length;
              const c = colorFor(product.color);
              const isInternal = product.visibility === "internal";
              return (
                <Link
                  key={product.id}
                  href={`/studio/${product.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group flex items-start gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-2xl flex-shrink-0 text-white`}>
                    {renderIcon(product.emoji, "w-7 h-7")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h2>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        {total} video{total !== 1 ? "s" : ""}
                      </span>
                      {published > 0 && (
                        <span className="text-green-600 font-medium">{published} published</span>
                      )}
                      {isInternal && (
                        <span className="ml-auto text-amber-600 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Internal
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          // Full list — drag to reorder
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <SortableCard key={product.id} product={product} videos={videoMap[product.id] ?? []} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
}

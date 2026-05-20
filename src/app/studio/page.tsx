"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  folderId?: string;
}

interface Video {
  id: string;
  title: string;
  published: boolean;
}

interface Folder {
  id: string;
  name: string;
  order: number;
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

const GripIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
    <circle cx="5.5" cy="3.5" r="1.2"/><circle cx="10.5" cy="3.5" r="1.2"/>
    <circle cx="5.5" cy="8"   r="1.2"/><circle cx="10.5" cy="8"   r="1.2"/>
    <circle cx="5.5" cy="12.5" r="1.2"/><circle cx="10.5" cy="12.5" r="1.2"/>
  </svg>
);

// ── Sortable topic card ─────────────────────────────────────────────
function SortableCard({
  product, videos, onRemoveFromFolder,
}: {
  product: Product;
  videos: Video[];
  onRemoveFromFolder?: () => void;
}) {
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
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-500 hover:bg-gray-100"
        title="Drag to reorder"
      >
        <GripIcon />
      </div>

      {onRemoveFromFolder && (
        <button
          onClick={onRemoveFromFolder}
          className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-md text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity hover:text-amber-600 hover:bg-amber-50"
          title="Remove from folder"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={1.75} />
          </svg>
        </button>
      )}

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

// ── Sortable + droppable folder tile ────────────────────────────────
function SortableFolderTile({
  folder,
  topicCount,
  isTopicOver,
  onClick,
  onRename,
  onDelete,
}: {
  folder: Folder;
  topicCount: number;
  isTopicOver: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `folder:${folder.id}` });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const trimmed = editName.trim();
    setEditing(false);
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    else setEditName(folder.name);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/drag ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-500 hover:bg-gray-100"
        title="Drag to reorder"
      >
        <GripIcon />
      </div>

      {/* Rename / Delete buttons */}
      <div className="absolute top-2.5 right-10 z-10 flex items-center gap-0.5 opacity-0 group-hover/drag:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(folder.name); }}
          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Rename folder"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete folder "${folder.name}"? Topics inside will move to Uncategorized.`)) onDelete();
          }}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete folder"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <button
        onClick={onClick}
        className={`w-full bg-white rounded-xl border p-5 text-left transition-all flex items-center gap-4 pr-10 ${
          isTopicOver
            ? "border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200"
            : "border-gray-200 hover:shadow-md hover:border-gray-300"
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors ${
          isTopicOver ? "bg-blue-100" : "bg-gray-100"
        }`}>
          <svg className={`w-5 h-5 transition-colors ${isTopicOver ? "text-blue-600" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditing(false); setEditName(folder.name); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-gray-900 text-sm w-full border-b border-blue-500 outline-none bg-transparent"
            />
          ) : (
            <p className="font-semibold text-gray-900 text-sm truncate">{folder.name}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{topicCount} topic{topicCount !== 1 ? "s" : ""}</p>
        </div>
        {!isTopicOver && (
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {isTopicOver && (
          <span className="text-xs text-blue-600 font-medium flex-shrink-0">Drop here</span>
        )}
      </button>
    </div>
  );
}

// ── Plain (non-drag) topic card for search results ──────────────────
function PlainCard({ product, videos }: { product: Product; videos: Video[] }) {
  const published = videos.filter((v) => v.published).length;
  const total = videos.length;
  const c = colorFor(product.color);
  const isInternal = product.visibility === "internal";

  return (
    <Link
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
}

// ── Main page ───────────────────────────────────────────────────────
export default function StudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videoMap, setVideoMap] = useState<Record<string, Video[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // Drag state for folder drop-target highlight
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [hoveringFolderId, setHoveringFolderId] = useState<string | null>(null);

  // New folder creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewFolder) newFolderInputRef.current?.focus();
  }, [showNewFolder]);

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
        return Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch("/api/folders").then((r) => r.json()),
        ]);
      })
      .then(async (results) => {
        if (!results) return;
        const [prods, folds] = results as [Product[], Folder[]];
        setProducts(prods);
        setFolders(folds);
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

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const folder: Folder = await res.json();
        setFolders((prev) => [...prev, folder]);
        setNewFolderName("");
        setShowNewFolder(false);
      }
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRenameFolder(folder: Folder, name: string) {
    setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, name } : f));
    await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function handleDeleteFolder(folder: Folder) {
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setProducts((prev) => prev.map((p) => p.folderId === folder.id ? { ...p, folderId: undefined } : p));
    if (openFolderId === folder.id) setOpenFolderId(null);
    await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
  }

  async function handleRemoveFromFolder(product: Product) {
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, folderId: undefined } : p));
    await fetch(`/api/products/${product.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: null }),
    });
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingProductId(null);
    setHoveringFolderId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const aId = String(active.id);
    const oId = String(over.id);

    if (aId.startsWith("folder:") && oId.startsWith("folder:")) {
      // Reorder folders
      const fromId = aId.slice(7);
      const toId = oId.slice(7);
      setFolders((prev) => {
        const oldIdx = prev.findIndex((f) => f.id === fromId);
        const newIdx = prev.findIndex((f) => f.id === toId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(prev, oldIdx, newIdx).map((f, i) => ({ ...f, order: i + 1 }));
        reordered.forEach((f, i) => {
          if (prev[i]?.id !== f.id) {
            fetch(`/api/folders/${f.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: f.order }),
            });
          }
        });
        return reordered;
      });
    } else if (!aId.startsWith("folder:") && oId.startsWith("folder:")) {
      // Drop topic into folder
      const folderId = oId.slice(7);
      setProducts((prev) => {
        const product = prev.find((p) => p.id === aId);
        if (!product || product.folderId === folderId) return prev;
        fetch(`/api/products/${product.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        });
        return prev.map((p) => p.id === aId ? { ...p, folderId } : p);
      });
    } else if (!aId.startsWith("folder:") && !oId.startsWith("folder:")) {
      // Reorder topics within current view
      setProducts((prev) => {
        const viewList = openFolderId
          ? prev.filter((p) => p.folderId === openFolderId)
          : prev.filter((p) => !p.folderId);
        const oldIdx = viewList.findIndex((p) => p.id === aId);
        const newIdx = viewList.findIndex((p) => p.id === oId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(viewList, oldIdx, newIdx).map((p, i) => ({ ...p, order: i + 1 }));
        reordered.forEach((p, i) => {
          if (viewList[i]?.id !== p.id) {
            fetch(`/api/products/${p.slug}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: p.order }),
            });
          }
        });
        const reorderedIds = new Set(reordered.map((p) => p.id));
        return [...prev.filter((p) => !reorderedIds.has(p.id)), ...reordered];
      });
    }
  }, [openFolderId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  const query = search.trim().toLowerCase();

  // Derived lists
  const openFolder = folders.find((f) => f.id === openFolderId);
  const folderTopics = openFolderId
    ? [...products.filter((p) => p.folderId === openFolderId)].sort((a, b) => a.order - b.order)
    : [];
  const uncategorized = [...products.filter((p) => !p.folderId)].sort((a, b) => a.order - b.order);

  // Search: all topics flat
  const searchResults = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
            {openFolder && (
              <>
                <span className="text-gray-300">/</span>
                <button
                  onClick={() => setOpenFolderId(null)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  All Topics
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  {openFolder.name}
                </span>
              </>
            )}
          </div>
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
        {/* Title row */}
        <div className="mb-6">
          {openFolder ? (
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setOpenFolderId(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">{openFolder.name}</h1>
              <span className="text-sm text-gray-400">{folderTopics.length} topic{folderTopics.length !== 1 ? "s" : ""}</span>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a topic to record</h1>
              <p className="text-sm text-gray-500">Select a topic to see its recording checklist and upload videos.</p>
            </>
          )}
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

        {/* ── Search results ── */}
        {query ? (
          searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No topics match &ldquo;{search}&rdquo;</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((product) => (
                <PlainCard key={product.id} product={product} videos={videoMap[product.id] ?? []} />
              ))}
            </div>
          )
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              const id = String(active.id);
              if (!id.startsWith("folder:")) setDraggingProductId(id);
            }}
            onDragOver={({ over }) => {
              if (!over) { setHoveringFolderId(null); return; }
              const id = String(over.id);
              setHoveringFolderId(id.startsWith("folder:") ? id.slice(7) : null);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { setDraggingProductId(null); setHoveringFolderId(null); }}
          >
            {/* ── Folder view ── */}
            {openFolder ? (
              <SortableContext items={folderTopics.map((p) => p.id)} strategy={rectSortingStrategy}>
                {folderTopics.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    <p className="text-sm text-gray-400">This folder is empty.</p>
                    <p className="text-xs text-gray-300 mt-1">Drag topics from All Topics view to add them here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {folderTopics.map((product) => (
                      <SortableCard
                        key={product.id}
                        product={product}
                        videos={videoMap[product.id] ?? []}
                        onRemoveFromFolder={() => handleRemoveFromFolder(product)}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            ) : (
              /* ── Root view ── */
              <div className="space-y-8">
                {/* Folders section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Folders</h2>
                    <button
                      onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Folder
                    </button>
                  </div>

                  {/* New folder input */}
                  {showNewFolder && (
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex items-center gap-3 flex-1 bg-white rounded-xl border border-blue-400 px-4 py-3 shadow-sm">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        <input
                          ref={newFolderInputRef}
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name"
                          className="flex-1 text-sm font-medium text-gray-900 outline-none placeholder-gray-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateFolder();
                            if (e.key === "Escape") setShowNewFolder(false);
                          }}
                        />
                      </div>
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || creatingFolder}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-3 transition-colors"
                      >
                        {creatingFolder ? "Creating…" : "Create"}
                      </button>
                      <button
                        onClick={() => setShowNewFolder(false)}
                        className="border border-gray-200 text-gray-600 text-sm rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {folders.length === 0 && !showNewFolder ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                      <p className="text-sm text-gray-400">No folders yet.</p>
                      <button
                        onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Create your first folder
                      </button>
                    </div>
                  ) : folders.length > 0 ? (
                    <SortableContext items={folders.map((f) => `folder:${f.id}`)} strategy={rectSortingStrategy}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {folders.map((folder) => (
                          <SortableFolderTile
                            key={folder.id}
                            folder={folder}
                            topicCount={products.filter((p) => p.folderId === folder.id).length}
                            isTopicOver={draggingProductId !== null && hoveringFolderId === folder.id}
                            onClick={() => setOpenFolderId(folder.id)}
                            onRename={(name) => handleRenameFolder(folder, name)}
                            onDelete={() => handleDeleteFolder(folder)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ) : null}
                </div>

                {/* Uncategorized topics section */}
                {uncategorized.length > 0 && (
                  <div>
                    {folders.length > 0 && (
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Uncategorized</h2>
                    )}
                    <SortableContext items={uncategorized.map((p) => p.id)} strategy={rectSortingStrategy}>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {uncategorized.map((product) => (
                          <SortableCard
                            key={product.id}
                            product={product}
                            videos={videoMap[product.id] ?? []}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                )}
              </div>
            )}
          </DndContext>
        )}
      </main>
    </div>
  );
}

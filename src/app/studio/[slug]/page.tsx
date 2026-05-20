"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { renderIconColored } from "@/lib/renderIcon";
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
  id: string; name: string; slug: string; color: string; emoji: string;
  visibility?: "public" | "internal";
  categoryVisibility?: Record<string, "public" | "internal">;
}
interface CatFolder { id: string; name: string; order: number; }
interface CategoryMeta {
  order: string[];
  folders: CatFolder[];
  folderAssignment: Record<string, string>;
}
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

const GripIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
    <circle cx="5.5" cy="3.5" r="1.2"/><circle cx="10.5" cy="3.5" r="1.2"/>
    <circle cx="5.5" cy="8"   r="1.2"/><circle cx="10.5" cy="8"   r="1.2"/>
    <circle cx="5.5" cy="12.5" r="1.2"/><circle cx="10.5" cy="12.5" r="1.2"/>
  </svg>
);

// ── Sortable category card ──────────────────────────────────────────
function SortableCategoryCard({
  cat, stats, product, onToggleVisibility, onRemoveFromFolder,
}: {
  cat: string;
  stats: { total: number; covered: number; drafts: number };
  product: Product;
  onToggleVisibility: () => void;
  onRemoveFromFolder?: () => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat });
  const c = col(product.color);
  const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
  const complete = pct === 100 && stats.total > 0 && stats.drafts === 0;
  const isInternal = (product.categoryVisibility?.[cat] ?? "public") === "internal";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/drag ${isDragging ? "opacity-50 z-50 shadow-2xl" : ""}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-500 hover:bg-gray-100"
        title="Drag to reorder"
      >
        <GripIcon />
      </div>

      {/* Remove from folder button */}
      {onRemoveFromFolder && (
        <button
          onClick={onRemoveFromFolder}
          className="absolute top-2.5 left-2.5 z-20 p-1.5 rounded-md text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity hover:text-amber-600 hover:bg-amber-50"
          title="Remove from folder"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={1.75} />
          </svg>
        </button>
      )}

      <Link
        href={`/studio/${slug}/${encodeURIComponent(cat)}`}
        className="relative block bg-white rounded-2xl border border-gray-200 px-5 pb-5 pt-8 hover:shadow-md hover:border-gray-300 transition-all group"
      >
        {/* Visibility toggle — nudged left to avoid drag handle */}
        <div className="absolute top-3.5 right-9 z-10">
          {product.visibility === "internal" ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-600" title="Restricted by product visibility">
              🔒 via product
            </span>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); }}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                isInternal
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
            >
              {isInternal ? "🔒 Internal" : "🌐 Public"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
            <svg className={`w-5 h-5 ${c.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-tight">{cat}</h2>
              {complete && <span className="text-sm flex-shrink-0">✅</span>}
              {stats.drafts > 0 && (
                <span className="text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 flex-shrink-0">
                  {stats.drafts} draft
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5">
              <div className={`h-1 rounded-full transition-all ${complete ? "bg-green-500" : c.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400">
              {stats.covered}/{stats.total} covered{pct > 0 && !complete ? ` · ${pct}%` : ""}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Sortable + droppable category folder tile ───────────────────────
function SortableCatFolderTile({
  folder, catCount, isTopicOver, onClick, onRename, onDelete,
}: {
  folder: CatFolder; catCount: number; isTopicOver: boolean;
  onClick: () => void; onRename: (name: string) => void; onDelete: () => void;
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

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/drag ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div
        {...attributes} {...listeners}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-500 hover:bg-gray-100"
        title="Drag to reorder"
      >
        <GripIcon />
      </div>

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
            if (confirm(`Delete folder "${folder.name}"? Categories inside will move to Uncategorized.`)) onDelete();
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
        <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors ${isTopicOver ? "bg-blue-100" : "bg-gray-100"}`}>
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
          <p className="text-xs text-gray-400 mt-0.5">{catCount} {catCount === 1 ? "category" : "categories"}</p>
        </div>
        {!isTopicOver ? (
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="text-xs text-blue-600 font-medium flex-shrink-0">Drop here</span>
        )}
      </button>
    </div>
  );
}

const EMPTY_META: CategoryMeta = { order: [], folders: [], folderAssignment: {} };

// ── Main page ───────────────────────────────────────────────────────
export default function StudioProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [catMeta, setCatMeta] = useState<CategoryMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draggingCatId, setDraggingCatId] = useState<string | null>(null);
  const [hoveringFolderId, setHoveringFolderId] = useState<string | null>(null);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatVisibility, setNewCatVisibility] = useState<"public" | "internal">("public");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => { if (showNewFolder) newFolderInputRef.current?.focus(); }, [showNewFolder]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch(`/api/checklist?productId=${slug}`).then((r) => r.json()),
          fetch(`/api/category-meta?productId=${slug}`).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [prods, chk, meta] = results as [Product[], ChecklistItem[], CategoryMeta];
        setProduct(prods.find((p) => p.slug === slug) ?? null);
        setChecklist(chk);
        setCatMeta(meta ?? EMPTY_META);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [slug, router]);

  // All categories with stats
  const categories = useMemo(() => {
    const map = new Map<string, { total: number; covered: number; drafts: number }>();
    for (const item of checklist) {
      const cat = item.category?.trim() || "Uncategorized";
      const cur = map.get(cat) ?? { total: 0, covered: 0, drafts: 0 };
      const hasDraft = !!item.videoId && !item.video?.published;
      map.set(cat, { total: cur.total + 1, covered: cur.covered + (item.videoId ? 1 : 0), drafts: cur.drafts + (hasDraft ? 1 : 0) });
    }
    return map;
  }, [checklist]);

  // Categories sorted by saved order, unknowns appended
  const orderedCategories = useMemo(() => {
    const all = Array.from(categories.keys());
    const known = catMeta.order.filter((c) => categories.has(c));
    const rest = all.filter((c) => !known.includes(c));
    return [...known, ...rest];
  }, [categories, catMeta.order]);

  const totalCovered = checklist.filter((i) => i.videoId).length;
  const draftItems = useMemo(() => checklist.filter((i) => i.videoId && i.video && !i.video.published), [checklist]);

  // Folder-aware derived lists
  const openFolder = catMeta.folders.find((f) => f.id === openFolderId) ?? null;
  const folderCats = openFolderId
    ? orderedCategories.filter((c) => catMeta.folderAssignment[c] === openFolderId)
    : [];
  const uncategorizedCats = orderedCategories.filter((c) => !catMeta.folderAssignment[c]);

  // Search
  const query = search.trim().toLowerCase();
  const searchResults = query ? orderedCategories.filter((c) => c.toLowerCase().includes(query)) : [];

  // Persist catMeta helper (fire-and-forget)
  function persistMeta(next: CategoryMeta) {
    fetch(`/api/category-meta?productId=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const newFolder: CatFolder = { id: crypto.randomUUID(), name: newFolderName.trim(), order: catMeta.folders.length + 1 };
      const next = { ...catMeta, folders: [...catMeta.folders, newFolder] };
      setCatMeta(next);
      persistMeta(next);
      setNewFolderName("");
      setShowNewFolder(false);
    } finally {
      setCreatingFolder(false);
    }
  }

  function handleRenameFolder(folder: CatFolder, name: string) {
    const next = { ...catMeta, folders: catMeta.folders.map((f) => f.id === folder.id ? { ...f, name } : f) };
    setCatMeta(next);
    persistMeta(next);
  }

  function handleDeleteFolder(folder: CatFolder) {
    const newAssignment = { ...catMeta.folderAssignment };
    for (const cat of Object.keys(newAssignment)) {
      if (newAssignment[cat] === folder.id) delete newAssignment[cat];
    }
    const next = { ...catMeta, folders: catMeta.folders.filter((f) => f.id !== folder.id), folderAssignment: newAssignment };
    setCatMeta(next);
    persistMeta(next);
    if (openFolderId === folder.id) setOpenFolderId(null);
  }

  function handleRemoveFromFolder(cat: string) {
    const newAssignment = { ...catMeta.folderAssignment };
    delete newAssignment[cat];
    const next = { ...catMeta, folderAssignment: newAssignment };
    setCatMeta(next);
    persistMeta(next);
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingCatId(null);
    setHoveringFolderId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const aId = String(active.id);
    const oId = String(over.id);

    setCatMeta((prev) => {
      const ordAll = (() => {
        const known = prev.order.filter((c) => categories.has(c));
        const rest = Array.from(categories.keys()).filter((c) => !known.includes(c));
        return [...known, ...rest];
      })();

      if (aId.startsWith("folder:") && oId.startsWith("folder:")) {
        // Reorder folders
        const fromId = aId.slice(7);
        const toId = oId.slice(7);
        const oi = prev.folders.findIndex((f) => f.id === fromId);
        const ni = prev.folders.findIndex((f) => f.id === toId);
        if (oi === -1 || ni === -1) return prev;
        const next = { ...prev, folders: arrayMove(prev.folders, oi, ni).map((f, i) => ({ ...f, order: i + 1 })) };
        persistMeta(next);
        return next;

      } else if (!aId.startsWith("folder:") && oId.startsWith("folder:")) {
        // Assign category to folder
        const folderId = oId.slice(7);
        if (prev.folderAssignment[aId] === folderId) return prev;
        const next = { ...prev, folderAssignment: { ...prev.folderAssignment, [aId]: folderId } };
        persistMeta(next);
        return next;

      } else if (!aId.startsWith("folder:") && !oId.startsWith("folder:")) {
        // Reorder categories within the current view
        const viewList = openFolderId
          ? ordAll.filter((c) => prev.folderAssignment[c] === openFolderId)
          : ordAll.filter((c) => !prev.folderAssignment[c]);
        const oi = viewList.indexOf(aId);
        const ni = viewList.indexOf(oId);
        if (oi === -1 || ni === -1) return prev;
        const reordered = arrayMove(viewList, oi, ni);
        // Splice reordered items back into their positions in the full order
        const full = [...ordAll];
        const positions = viewList.map((c) => full.indexOf(c));
        reordered.forEach((c, i) => { full[positions[i]] = c; });
        const next = { ...prev, order: full };
        persistMeta(next);
        return next;
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFolderId, categories]);

  async function toggleCategoryVisibility(cat: string) {
    const current = product?.categoryVisibility?.[cat] ?? "public";
    const next = current === "internal" ? "public" : "internal";
    const newCatViz = { ...(product?.categoryVisibility ?? {}), [cat]: next } as Record<string, "public" | "internal">;
    setProduct((prev) => prev ? { ...prev, categoryVisibility: newCatViz } : null);
    const res = await fetch(`/api/products/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryVisibility: newCatViz }),
    });
    if (!res.ok) setProduct((prev) => prev ? { ...prev, categoryVisibility: product?.categoryVisibility ?? {} } : null);
  }

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (newCatVisibility === "internal") {
      const newCatViz = { ...(product?.categoryVisibility ?? {}), [name]: "internal" } as Record<string, "public" | "internal">;
      setProduct((prev) => prev ? { ...prev, categoryVisibility: newCatViz } : null);
      await fetch(`/api/products/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryVisibility: newCatViz }),
      });
    }
    router.push(`/studio/${slug}/${encodeURIComponent(name)}`);
  }

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
    } finally { setPublishingId(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const c = col(product?.color ?? "blue");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {openFolder ? (
              <>
                <Link href={`/studio/${slug}`} onClick={() => setOpenFolderId(null)} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  ← {product ? renderIconColored(product.emoji, "w-4 h-4 inline-block") : null} {product?.name}
                </Link>
                <span className="text-gray-300">/</span>
                <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  {openFolder.name}
                </span>
              </>
            ) : (
              <>
                <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Recording Studio</Link>
                <span className="text-gray-300">/</span>
                <span className="font-semibold text-gray-900 text-sm inline-flex items-center gap-1.5">
                  {product ? renderIconColored(product.emoji, "w-4 h-4 flex-shrink-0") : null} {product?.name}
                </span>
              </>
            )}
          </div>
          {user && <UserMenu user={user} />}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Title row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {openFolder ? (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <button onClick={() => setOpenFolderId(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h1 className="text-xl font-bold text-gray-900">{openFolder.name}</h1>
                  <span className="text-sm text-gray-400">{folderCats.length} {folderCats.length === 1 ? "category" : "categories"}</span>
                </div>
                <p className="text-sm text-gray-500 ml-7">Drag a category onto another folder to move it.</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-0.5">Categories</h1>
                <p className="text-sm text-gray-500">
                  {checklist.length === 0
                    ? "No items yet — create a category to get started."
                    : `${totalCovered} of ${checklist.length} items covered across ${categories.size} ${categories.size === 1 ? "category" : "categories"}`}
                </p>
              </>
            )}
          </div>
          {!openFolder && (
            <button
              onClick={() => { setShowNewCat(true); setNewCatName(""); setNewCatVisibility("public"); }}
              className={`text-sm font-medium text-white rounded-lg px-4 py-2 transition-colors flex-shrink-0 ${c.bg}`}
            >
              + New Category
            </button>
          )}
        </div>

        {/* New category form */}
        {showNewCat && !openFolder && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category name</label>
              <input
                type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Workflows"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); if (e.key === "Escape") setShowNewCat(false); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewCatVisibility("public")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${newCatVisibility === "public" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  🌐 Public
                </button>
                <button type="button" onClick={() => setNewCatVisibility("internal")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${newCatVisibility === "internal" ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
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

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
        </div>

        {categories.size === 0 && !showNewCat ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-500 font-medium mb-1">No categories yet</p>
            <p className="text-sm text-gray-400 mb-4">Create a category to start organizing your recordings.</p>
            <button onClick={() => setShowNewCat(true)} className="text-blue-600 hover:underline text-sm">+ Create your first category</button>
          </div>
        ) : query ? (
          /* ── Search results ── */
          searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No categories match &ldquo;{search}&rdquo;</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {searchResults.map((cat) => (
                <SortableCategoryCard
                  key={cat} cat={cat} stats={categories.get(cat)!}
                  product={product!} onToggleVisibility={() => toggleCategoryVisibility(cat)}
                />
              ))}
            </div>
          )
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              const id = String(active.id);
              if (!id.startsWith("folder:")) setDraggingCatId(id);
            }}
            onDragOver={({ over }) => {
              if (!over) { setHoveringFolderId(null); return; }
              const id = String(over.id);
              setHoveringFolderId(id.startsWith("folder:") ? id.slice(7) : null);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { setDraggingCatId(null); setHoveringFolderId(null); }}
          >
            {openFolder ? (
              /* ── Folder view ── */
              <SortableContext items={folderCats} strategy={rectSortingStrategy}>
                {folderCats.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                    <p className="text-sm text-gray-400">This folder is empty.</p>
                    <p className="text-xs text-gray-300 mt-1">Go back and drag categories here from the root view.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {folderCats.map((cat) => (
                      <SortableCategoryCard
                        key={cat} cat={cat} stats={categories.get(cat)!}
                        product={product!} onToggleVisibility={() => toggleCategoryVisibility(cat)}
                        onRemoveFromFolder={() => handleRemoveFromFolder(cat)}
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

                  {showNewFolder && (
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex items-center gap-3 flex-1 bg-white rounded-xl border border-blue-400 px-4 py-3 shadow-sm">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        <input
                          ref={newFolderInputRef} type="text" value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name"
                          className="flex-1 text-sm font-medium text-gray-900 outline-none placeholder-gray-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateFolder();
                            if (e.key === "Escape") setShowNewFolder(false);
                          }}
                        />
                      </div>
                      <button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-3 transition-colors">
                        {creatingFolder ? "Creating…" : "Create"}
                      </button>
                      <button onClick={() => setShowNewFolder(false)}
                        className="border border-gray-200 text-gray-600 text-sm rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}

                  {catMeta.folders.length === 0 && !showNewFolder ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                      <p className="text-sm text-gray-400">No folders yet.</p>
                      <button onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
                        className="text-xs text-blue-600 hover:underline mt-1">
                        Create your first folder
                      </button>
                    </div>
                  ) : catMeta.folders.length > 0 ? (
                    <SortableContext items={catMeta.folders.map((f) => `folder:${f.id}`)} strategy={rectSortingStrategy}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {catMeta.folders.map((folder) => (
                          <SortableCatFolderTile
                            key={folder.id} folder={folder}
                            catCount={orderedCategories.filter((c) => catMeta.folderAssignment[c] === folder.id).length}
                            isTopicOver={draggingCatId !== null && hoveringFolderId === folder.id}
                            onClick={() => setOpenFolderId(folder.id)}
                            onRename={(name) => handleRenameFolder(folder, name)}
                            onDelete={() => handleDeleteFolder(folder)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ) : null}
                </div>

                {/* Uncategorized categories */}
                {uncategorizedCats.length > 0 && (
                  <div>
                    {catMeta.folders.length > 0 && (
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Uncategorized</h2>
                    )}
                    <SortableContext items={uncategorizedCats} strategy={rectSortingStrategy}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {uncategorizedCats.map((cat) => (
                          <SortableCategoryCard
                            key={cat} cat={cat} stats={categories.get(cat)!}
                            product={product!} onToggleVisibility={() => toggleCategoryVisibility(cat)}
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

        {/* Drafts pending publish */}
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
                    <p className="text-xs text-gray-400 mt-0.5">{item.category ?? "Uncategorized"} · {item.title}</p>
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

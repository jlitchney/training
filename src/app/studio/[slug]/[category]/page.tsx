"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { UserMenu } from "@/components/UserMenu";
import { RichTextEditor, stripHtml } from "@/components/RichTextEditor";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Product { id: string; name: string; slug: string; color: string; emoji: string; visibility?: 'public' | 'internal'; categoryVisibility?: Record<string, 'public' | 'internal'>; }
interface Video { id: string; title: string; description: string; blobUrl: string; published: boolean; recordedBy: string; recordedAt: string; duration?: number; visibility?: 'public' | 'internal'; thumbnailUrl?: string; }
interface ChecklistItem { id: string; title: string; description?: string; category?: string; videoId?: string; video?: Video; order: number; type?: "video" | "article"; articleContent?: string; visibility?: "public" | "internal"; }

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-600", indigo: "bg-indigo-600", violet: "bg-violet-600",
  purple: "bg-purple-600", pink: "bg-pink-600", rose: "bg-rose-600",
  red: "bg-red-600", orange: "bg-orange-500", amber: "bg-amber-500",
  lime: "bg-lime-600", green: "bg-green-600", emerald: "bg-emerald-600",
  teal: "bg-teal-600", cyan: "bg-cyan-600", sky: "bg-sky-500",
};
const COLOR_TEXT: Record<string, string> = {
  blue: "text-blue-700", indigo: "text-indigo-700", violet: "text-violet-700",
  purple: "text-purple-700", pink: "text-pink-700", rose: "text-rose-700",
  red: "text-red-700", orange: "text-orange-700", amber: "text-amber-700",
  lime: "text-lime-700", green: "text-green-700", emerald: "text-emerald-700",
  teal: "text-teal-700", cyan: "text-cyan-700", sky: "text-sky-700",
};
const COLOR_BADGE: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700", indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700", purple: "bg-purple-50 border-purple-200 text-purple-700",
  pink: "bg-pink-50 border-pink-200 text-pink-700", rose: "bg-rose-50 border-rose-200 text-rose-700",
  red: "bg-red-50 border-red-200 text-red-700", orange: "bg-orange-50 border-orange-200 text-orange-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700", lime: "bg-lime-50 border-lime-200 text-lime-700",
  green: "bg-green-50 border-green-200 text-green-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  teal: "bg-teal-50 border-teal-200 text-teal-700", cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
  sky: "bg-sky-50 border-sky-200 text-sky-700",
};

function blobSrc(url: string) {
  if (url.includes(".blob.vercel-storage.com")) return `/api/blob?url=${encodeURIComponent(url)}`;
  return url;
}

// sessionStorage helpers — guard against SSR and private-mode exceptions
function cacheVideo(video: Video) {
  try { sessionStorage.setItem(`vid:${video.id}`, JSON.stringify(video)); } catch { /* ignore */ }
}
function uncacheVideo(videoId: string) {
  try { sessionStorage.removeItem(`vid:${videoId}`); } catch { /* ignore */ }
}
function getCachedVideo(videoId: string): Video | null {
  try {
    const s = sessionStorage.getItem(`vid:${videoId}`);
    return s ? (JSON.parse(s) as Video) : null;
  } catch { return null; }
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function captureThumbnailFromBlob(videoBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(videoBlob);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 8000);
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(2, video.duration * 0.1);
    });
    video.addEventListener("seeked", () => {
      clearTimeout(timer);
      const w = Math.min(video.videoWidth || 640, 640);
      const h = video.videoWidth > 0 ? Math.round(w * video.videoHeight / video.videoWidth) : 360;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); resolve(null); return; }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => { cleanup(); resolve(blob); }, "image/jpeg", 0.8);
    });
    video.addEventListener("error", () => { clearTimeout(timer); cleanup(); resolve(null); });
  });
}

function captureFrameFromUrl(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    const timer = setTimeout(() => { video.src = ""; resolve(null); }, 10000);
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(2, video.duration * 0.1);
    });
    video.addEventListener("seeked", () => {
      clearTimeout(timer);
      const w = Math.min(video.videoWidth || 640, 640);
      const h = video.videoWidth > 0 ? Math.round(w * video.videoHeight / video.videoWidth) : 360;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { video.src = ""; resolve(null); return; }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => { video.src = ""; resolve(blob); }, "image/jpeg", 0.8);
    });
    video.addEventListener("error", () => { clearTimeout(timer); video.src = ""; resolve(null); });
  });
}

const GripIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
    <circle cx="5.5" cy="3.5" r="1.1"/><circle cx="10.5" cy="3.5" r="1.1"/>
    <circle cx="5.5" cy="8"   r="1.1"/><circle cx="10.5" cy="8"   r="1.1"/>
    <circle cx="5.5" cy="12.5" r="1.1"/><circle cx="10.5" cy="12.5" r="1.1"/>
  </svg>
);

function SortableSidebarItem({
  item, isSelected, isEditing, editTitle, colorBg,
  onSelect, onStartEdit, onFinishEdit, onEditChange, onDelete,
}: {
  item: ChecklistItem; isSelected: boolean; isEditing: boolean; editTitle: string; colorBg: string;
  onSelect: () => void; onStartEdit: () => void; onFinishEdit: () => void;
  onEditChange: (v: string) => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const isArticle = item.type === "article";
  const isDone = isArticle ? !!item.articleContent?.trim() : !!item.videoId;
  const isPublished = isArticle ? isDone : isDone && item.video?.published === true;
  const isDraft = !isArticle && isDone && !isPublished;
  const icon = isDone ? "✅" : isDraft ? "🟡" : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group/item border-b border-gray-50 ${isDragging ? "opacity-50 z-50 shadow-lg" : ""}`}
    >
      {isEditing ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onFinishEdit(); if (e.key === "Escape") onFinishEdit(); }}
            onBlur={onFinishEdit}
            className="w-full text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none"
          />
        </div>
      ) : (
        <>
          {/* Grip handle */}
          <div
            {...attributes}
            {...listeners}
            className={`absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none select-none ${isSelected ? "text-white/50 hover:text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
            title="Drag to reorder"
          >
            <GripIcon />
          </div>
          <button
            onClick={onSelect}
            className={`w-full text-left flex items-start gap-2.5 pl-7 pr-14 py-2.5 text-sm transition-colors ${
              isSelected ? `${colorBg} text-white` : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {icon ? (
              <span className="flex-shrink-0 mt-0.5 text-xs leading-none">{icon}</span>
            ) : isArticle ? (
              <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isSelected ? "text-white opacity-70" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <span className="flex-shrink-0 mt-0.5 text-xs leading-none">⬜</span>
            )}
            {!isArticle && isDone && item.video?.visibility === "internal" && (
              <svg className={`w-3 h-3 flex-shrink-0 mt-0.5 ${isSelected ? "text-white opacity-60" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {isArticle && item.visibility === "internal" && (
              <svg className={`w-3 h-3 flex-shrink-0 mt-0.5 ${isSelected ? "text-white opacity-60" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            <span className="leading-snug">{item.title}</span>
          </button>
          <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity`}>
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              className={`p-1.5 rounded ${isSelected ? "text-white/60 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
              title="Rename"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={`p-1.5 rounded ${isSelected ? "text-white/60 hover:text-red-300 hover:bg-white/20" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudioCategoryPage() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  const decodedCategory = decodeURIComponent(category);
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addType, setAddType] = useState<"video" | "article">("video");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");

  const [articleDraft, setArticleDraft] = useState("");
  const [articleSaving, setArticleSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selectedItemRef = useRef<ChecklistItem | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef("");
  const thumbGenStarted = useRef(false);

  const [pendingBlobUrl, setPendingBlobUrl] = useState("");
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string | undefined>();
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return Promise.all([
          fetch("/api/products").then((r) => r.json()),
          fetch(`/api/videos?productId=${slug}`).then((r) => r.json()),
          fetch(`/api/checklist?productId=${slug}`).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [prods, vids, chk] = results as [Product[], Video[], ChecklistItem[]];
        setProduct(prods.find((p) => p.slug === slug) ?? null);
        setVideos(vids);
        setChecklist(chk);
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [slug, router]);

  const categoryItems = useMemo(
    () => checklist.filter((i) => (i.category?.trim() || "Uncategorized") === decodedCategory),
    [checklist, decodedCategory]
  );

  const selectedItem = useMemo(
    () => categoryItems.find((i) => i.id === selectedItemId) ?? null,
    [categoryItems, selectedItemId]
  );
  useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);

  // Auto-select first covered item on load, or first item if none covered
  useEffect(() => {
    if (loading || categoryItems.length === 0 || selectedItemId) return;
    const covered = categoryItems.find((i) => i.type === "article" ? !!i.articleContent?.trim() : !!i.videoId);
    setSelectedItemId((covered ?? categoryItems[0]).id);
  }, [loading, categoryItems, selectedItemId]);

  // Sync article draft when selected item changes
  useEffect(() => {
    if (selectedItem?.type === "article") {
      setArticleDraft(selectedItem.articleContent ?? "");
    }
  }, [selectedItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently generate + save thumbnails for existing videos that don't have one
  useEffect(() => {
    if (loading || thumbGenStarted.current) return;
    const needThumbs = videos.filter((v) => v.blobUrl && !v.thumbnailUrl);
    if (needThumbs.length === 0) return;
    thumbGenStarted.current = true;
    (async () => {
      for (const video of needThumbs) {
        const thumbBlob = await captureFrameFromUrl(blobSrc(video.blobUrl));
        if (!thumbBlob) continue;
        const result = await uploadBlob(thumbBlob, `thumb-${video.id}-${Date.now()}.jpg`);
        if (!result) continue;
        await fetch(`/api/videos/${video.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: slug, thumbnailUrl: result.url }),
        });
        setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, thumbnailUrl: result.url } : v));
      }
    })();
  }, [loading, videos, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const item of checklist) { if (item.category) set.add(item.category); }
    return Array.from(set);
  }, [checklist]);

  const linkedVideo = useMemo(() => {
    if (selectedItem?.video) return selectedItem.video;
    if (!selectedItem?.videoId) return null;
    return videos.find((v) => v.id === selectedItem.videoId) ?? getCachedVideo(selectedItem.videoId);
  }, [selectedItem, videos]);

  const categoryCovered = categoryItems.filter((i) => i.type === "article" ? !!i.articleContent?.trim() : !!i.videoId).length;
  const categoryPublished = categoryItems.filter((i) => i.type === "article" ? !!i.articleContent?.trim() : !!i.video?.published).length;
  const categoryDrafts = categoryItems.filter((i) => i.type !== "article" && !!i.videoId && !i.video?.published).length;
  const published = videos.filter((v) => v.published).length;
  const colorBg = COLOR_BG[product?.color ?? "blue"] ?? "bg-blue-600";
  const colorBadge = COLOR_BADGE[product?.color ?? "blue"] ?? COLOR_BADGE.blue;
  const colorText = COLOR_TEXT[product?.color ?? "blue"] ?? "text-blue-700";

  function selectItem(id: string) {
    if (pendingBlobUrl && !confirm("You have an unsaved recording. Discard it and switch items?")) return;
    setSelectedItemId(id);
    setPendingBlobUrl(""); setPendingThumbnailUrl(undefined); setFormTitle(""); setFormCategory(""); setFormDesc(""); setUploadError("");
  }

  function handleBreadcrumbNav(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pendingBlobUrl && !confirm("You have an unsaved recording. Leave anyway?")) e.preventDefault();
  }

  async function handleAddItem() {
    if (!addTitle.trim()) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "add", productId: slug, title: addTitle.trim(), category: decodedCategory, itemType: addType }),
      });
      if (res.ok) {
        const item: ChecklistItem = await res.json();
        setChecklist((prev) => [...prev, item]);
        setAddTitle("");
        setShowAddItem(false);
        selectItem(item.id);
      }
    } finally {
      setAddSaving(false);
    }
  }

  async function handleRenameItem(itemId: string) {
    const newTitle = editingItemTitle.trim();
    setEditingItemId(null);
    if (!newTitle) return;
    const item = checklist.find((i) => i.id === itemId);
    if (!item || newTitle === item.title) return;
    fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "update", productId: slug, itemId, title: newTitle }),
    });
    setChecklist((prev) => prev.map((i) => i.id === itemId ? { ...i, title: newTitle } : i));
  }

  async function handleDeleteItem(item: ChecklistItem) {
    const msg = item.videoId
      ? `Delete "${item.title}"? The linked video will also be deleted.`
      : `Delete "${item.title}"?`;
    if (!confirm(msg)) return;
    if (item.videoId) {
      fetch(`/api/videos/${item.videoId}?productId=${slug}`, { method: "DELETE" });
      uncacheVideo(item.videoId);
      setVideos((prev) => prev.filter((v) => v.id !== item.videoId));
    }
    fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete", productId: slug, itemId: item.id }),
    });
    setChecklist((prev) => prev.filter((i) => i.id !== item.id));
    if (selectedItemId === item.id) setSelectedItemId(null);
  }

  async function handleSaveArticle() {
    if (!selectedItemId) return;
    setArticleSaving(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "update", productId: slug, itemId: selectedItemId, articleContent: articleDraft }),
      });
      if (res.ok) setChecklist((prev) => prev.map((i) => i.id === selectedItemId ? { ...i, articleContent: articleDraft } : i));
    } finally {
      setArticleSaving(false);
    }
  }

  async function toggleArticleVisibility() {
    if (!selectedItem) return;
    const next = (selectedItem.visibility ?? "public") === "internal" ? "public" : "internal";
    const res = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "update", productId: slug, itemId: selectedItem.id, visibility: next }),
    });
    if (res.ok) setChecklist((prev) => prev.map((i) => i.id === selectedItem.id ? { ...i, visibility: next } : i));
  }

  function handleSidebarDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const aId = String(active.id);
    const oId = String(over.id);
    setChecklist((prev) => {
      const catIds = prev
        .filter((i) => (i.category?.trim() || "Uncategorized") === decodedCategory)
        .map((i) => i.id);
      const oi = catIds.indexOf(aId);
      const ni = catIds.indexOf(oId);
      if (oi === -1 || ni === -1) return prev;
      const reordered = arrayMove(catIds, oi, ni);
      const positions = catIds.map((id) => prev.findIndex((i) => i.id === id));
      const full = [...prev];
      reordered.forEach((id, i) => { full[positions[i]] = prev.find((item) => item.id === id)!; });
      fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reorder", productId: slug, items: full }),
      });
      return full;
    });
  }

  async function uploadBlob(blob: Blob, filename: string): Promise<{ url: string } | null> {
    setUploadError("");
    try {
      const result = await upload(filename, blob, { access: "private", handleUploadUrl: "/api/upload" });
      return { url: result.url };
    } catch (err: unknown) {
      setUploadError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  const startRecording = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      let micStream: MediaStream | null = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* mic denied */ }

      transcriptRef.current = "";
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recognition: any = new SR();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = "en-US";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (e: any) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript + " ";
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch { /* unavailable */ }

      const tracks = [...screenStream.getVideoTracks()];
      if (micStream) tracks.push(...micStream.getAudioTracks());
      const combinedStream = new MediaStream(tracks);
      const startTime = Date.now();
      const recorder = new MediaRecorder(combinedStream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        screenStream.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        setRecording(false);
        setUploading(true);
        try {
          const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
          const ts = Date.now();
          const [thumbBlob, result] = await Promise.all([
            captureThumbnailFromBlob(videoBlob),
            uploadBlob(videoBlob, `recording-${ts}.webm`),
          ]);
          if (result) {
            let thumbUrl: string | undefined;
            if (thumbBlob) {
              const thumbResult = await uploadBlob(thumbBlob, `thumb-${ts}.jpg`);
              thumbUrl = thumbResult?.url;
            }
            const item = selectedItemRef.current;
            setPendingBlobUrl(result.url);
            setPendingThumbnailUrl(thumbUrl);
            setPendingDuration(duration);
            setFormTitle(item?.title ?? "");
            setFormCategory(item?.category ?? decodedCategory);
            const transcript = transcriptRef.current.trim();
            setFormDesc(transcript ? `<p>${transcript}</p>` : "");
          }
        } finally {
          setUploading(false);
        }
      };
      screenStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
        setRecording(false);
      };
      recorder.start(1000);
      setRecording(true);
      mediaRecorderRef.current = recorder;
    } catch { /* cancelled */ }
  }, [decodedCategory]);

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  async function generateDescription() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle || selectedItem?.title, category: formCategory || decodedCategory, product: product?.name, transcript: stripHtml(formDesc) }),
      });
      if (res.ok) {
        const { description } = await res.json();
        if (description) setFormDesc(`<p>${description}</p>`);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveVideo() {
    if (!formTitle.trim() || !pendingBlobUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: slug, title: formTitle, description: formDesc, blobUrl: pendingBlobUrl, duration: pendingDuration, thumbnailUrl: pendingThumbnailUrl }),
      });
      if (!res.ok) return;
      const video: Video = await res.json();
      setVideos((prev) => [video, ...prev]);

      if (selectedItemId) {
        const orig = selectedItem;
        if (orig && (formTitle !== orig.title || formCategory !== (orig.category ?? ""))) {
          await fetch("/api/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "update", productId: slug, itemId: selectedItemId, title: formTitle, category: formCategory || undefined }),
          });
          setChecklist((prev) => prev.map((i) => (i.id === selectedItemId ? { ...i, title: formTitle, category: formCategory || undefined } : i)));
        }
        const linkRes = await fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link", productId: slug, itemId: selectedItemId, videoId: video.id, video }),
        });
        if (!linkRes.ok) {
          setUploadError("Video saved but failed to link to checklist item. Please reload and try again.");
          return;
        }
        setChecklist((prev) => prev.map((i) => (i.id === selectedItemId ? { ...i, videoId: video.id, video } : i)));
        cacheVideo(video);
      }

      setPendingBlobUrl(""); setPendingThumbnailUrl(undefined); setFormTitle(""); setFormCategory(""); setFormDesc("");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(video: Video) {
    setPublishError("");
    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: slug, published: !video.published }),
    });
    if (res.ok) {
      const toggled = { ...video, published: !video.published };
      cacheVideo(toggled);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? toggled : v)));
      setChecklist((prev) => prev.map((i) =>
        i.video?.id === video.id ? { ...i, video: toggled } : i
      ));
    } else {
      const err = await res.json().catch(() => ({}));
      setPublishError(`Failed: ${err.error ?? res.status}`);
    }
  }

  async function handleEditSave() {
    if (!editVideo) return;
    const res = await fetch(`/api/videos/${editVideo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: slug, title: editTitle, description: editDesc }),
    });
    if (!res.ok) return;
    const edited = { ...editVideo, title: editTitle, description: editDesc };
    cacheVideo(edited);
    setVideos((prev) => prev.map((v) => (v.id === editVideo.id ? edited : v)));
    setChecklist((prev) => prev.map((i) =>
      i.video?.id === editVideo.id ? { ...i, video: edited } : i
    ));
    setEditVideo(null);
  }

  async function toggleVideoVisibility(video: Video) {
    const next = (video.visibility ?? "public") === "internal" ? "public" : "internal";
    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: slug, visibility: next }),
    });
    if (res.ok) {
      const updated = { ...video, visibility: next } as Video;
      cacheVideo(updated);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? updated : v)));
      setChecklist((prev) => prev.map((i) => (i.video?.id === video.id ? { ...i, video: updated } : i)));
    }
  }

  async function handleDelete(video: Video) {
    if (!confirm(`Delete "${video.title}"?`)) return;
    await fetch(`/api/videos/${video.id}?productId=${slug}`, { method: "DELETE" });
    uncacheVideo(video.id);
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setChecklist((prev) => prev.map((i) => (i.videoId === video.id ? { ...i, videoId: undefined, video: undefined } : i)));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/studio/${slug}`} onClick={handleBreadcrumbNav} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              ← {product?.emoji} {product?.name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900 text-sm">{decodedCategory}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                <strong className={`font-semibold ${colorText}`}>{categoryCovered}</strong>
                <span className="text-gray-400">/{categoryItems.length}</span> covered
              </span>
              <span><strong className="font-semibold text-green-600">{categoryPublished}</strong> published</span>
              {categoryDrafts > 0 && (
                <span><strong className="font-semibold text-yellow-500">{categoryDrafts}</strong> draft</span>
              )}
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{decodedCategory}</span>
            <button
              onClick={() => { setShowAddItem((s) => !s); setAddTitle(""); setAddType("video"); }}
              className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded px-2 py-0.5 transition-colors flex-shrink-0 ml-2"
            >
              + Add
            </button>
          </div>

          {showAddItem && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setAddType("video")}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs rounded py-1 font-medium transition-colors ${addType === "video" ? "bg-white border border-blue-400 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                  Video
                </button>
                <button
                  onClick={() => setAddType("article")}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs rounded py-1 font-medium transition-colors ${addType === "article" ? "bg-white border border-blue-400 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Article
                </button>
              </div>
              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Item title *"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm mb-2.5 focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); if (e.key === "Escape") setShowAddItem(false); }}
              />
              <div className="flex gap-2">
                <button onClick={handleAddItem} disabled={addSaving || !addTitle.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded py-1.5 transition-colors">
                  {addSaving ? "Adding…" : "Add"}
                </button>
                <button onClick={() => setShowAddItem(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-xs rounded py-1.5 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {categoryItems.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">No items yet.</p>
                <button onClick={() => setShowAddItem(true)} className="text-xs text-blue-600 hover:underline">
                  + Add your first item
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSidebarDragEnd}>
                <SortableContext items={categoryItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {categoryItems.map((item) => (
                    <SortableSidebarItem
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedItemId}
                      isEditing={editingItemId === item.id}
                      editTitle={editingItemTitle}
                      colorBg={colorBg}
                      onSelect={() => selectItem(item.id)}
                      onStartEdit={() => { setEditingItemId(item.id); setEditingItemTitle(item.title); }}
                      onFinishEdit={() => handleRenameItem(item.id)}
                      onEditChange={setEditingItemTitle}
                      onDelete={() => handleDeleteItem(item)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-base font-medium text-gray-600 mb-1">Select an item to record</p>
              <p className="text-sm text-gray-400">Choose from the sidebar, or add a new item.</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${colorBadge}`}>
                    {decodedCategory}
                  </span>
                  <h1 className="text-xl font-bold text-gray-900">{selectedItem.title}</h1>
                  {selectedItem.description && <p className="text-sm text-gray-500 mt-1">{selectedItem.description}</p>}
                </div>
                <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border mt-1 ${selectedItem.type === "article" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                  {selectedItem.type === "article" ? "Article" : "Video"}
                </span>
              </div>

              {selectedItem.type === "article" ? (
                /* ── Article editor ── */
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-900 text-sm">Article Content</h2>
                    {(() => {
                      const inheritedFrom = product?.visibility === "internal" ? "product"
                        : (product?.categoryVisibility?.[decodedCategory] ?? "public") === "internal" ? "category"
                        : null;
                      return inheritedFrom ? (
                        <span className="text-xs font-medium px-3 py-1 rounded-full border border-amber-200 text-amber-600 bg-amber-50" title={`Restricted by ${inheritedFrom} visibility`}>
                          🔒 via {inheritedFrom}
                        </span>
                      ) : (
                        <button
                          onClick={toggleArticleVisibility}
                          className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${(selectedItem.visibility ?? "public") === "internal" ? "border-amber-300 text-amber-600 bg-amber-50" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                        >
                          {(selectedItem.visibility ?? "public") === "internal" ? "🔒 Internal" : "🌐 Public"}
                        </button>
                      );
                    })()}
                  </div>
                  <RichTextEditor
                    value={articleDraft}
                    onChange={setArticleDraft}
                    placeholder="Write your article content here…"
                  />
                  <div className="mt-4">
                    <button
                      onClick={handleSaveArticle}
                      disabled={articleSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors"
                    >
                      {articleSaving ? "Saving…" : "Save Article"}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Video UI ── */
                <>
                  {!pendingBlobUrl && (
                    <div className="mb-6">
                      {uploading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin inline-block" />
                          Uploading recording…
                        </div>
                      ) : recording ? (
                        <button onClick={stopRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          Stop Recording
                        </button>
                      ) : !linkedVideo ? (
                        <button onClick={startRecording} className={`flex items-center gap-2 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors ${colorBg}`}>
                          ● Record Screen
                        </button>
                      ) : null}
                      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
                    </div>
                  )}

                  {pendingBlobUrl && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                      <h2 className="font-semibold text-gray-900 mb-4">Save Recording</h2>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
                            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                            <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} list="form-cat-list"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                            <datalist id="form-cat-list">
                              {allCategoryNames.map((c) => <option key={c} value={c} />)}
                            </datalist>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-600">Description</label>
                            <button onClick={generateDescription} disabled={generating}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 transition-colors">
                              {generating ? (
                                <><span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin inline-block" /> Generating…</>
                              ) : <>✨ Generate with AI</>}
                            </button>
                          </div>
                          <RichTextEditor value={formDesc} onChange={setFormDesc} placeholder="Describe what this video covers, or use ✨ Generate" />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button onClick={handleSaveVideo} disabled={saving || !formTitle.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                          {saving ? "Saving…" : "Save Video"}
                        </button>
                        <button onClick={() => { setPendingBlobUrl(""); setFormTitle(""); setFormCategory(""); setFormDesc(""); }}
                          className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {linkedVideo ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${linkedVideo.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {linkedVideo.published ? "Published" : "Draft"}
                            </span>
                            {linkedVideo.duration && <span className="text-xs text-gray-400">{formatDuration(linkedVideo.duration)}</span>}
                          </div>
                          <h3 className="font-medium text-gray-900">{linkedVideo.title}</h3>
                          {linkedVideo.description && (
                            <div className="text-sm text-gray-500 mt-1 prose-sm [&_ul]:list-disc [&_ul]:pl-4 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold"
                              dangerouslySetInnerHTML={{ __html: linkedVideo.description }} />
                          )}
                          <p className="text-xs text-gray-400 mt-1.5">by {linkedVideo.recordedBy} · {new Date(linkedVideo.recordedAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setPreviewVideo(linkedVideo)} className="flex-shrink-0 relative group">
                          <video src={blobSrc(linkedVideo.blobUrl)} className="w-32 h-20 rounded object-cover bg-gray-100" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xl">▶</span>
                          </div>
                        </button>
                      </div>
                      {publishError && <p className="mt-2 text-sm text-red-600">{publishError}</p>}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button onClick={() => togglePublish(linkedVideo)}
                          className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${linkedVideo.published ? "border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600" : "border-green-300 text-green-700 hover:bg-green-50"}`}>
                          {linkedVideo.published ? "Unpublish" : "Publish"}
                        </button>
                        {(() => {
                          const inheritedFrom = product?.visibility === "internal" ? "product"
                            : (product?.categoryVisibility?.[decodedCategory] ?? "public") === "internal" ? "category"
                            : null;
                          return inheritedFrom ? (
                            <span className="text-xs font-medium px-3 py-1 rounded-full border border-amber-200 text-amber-600 bg-amber-50" title={`Restricted by ${inheritedFrom} visibility`}>
                              🔒 via {inheritedFrom}
                            </span>
                          ) : (
                            <button onClick={() => toggleVideoVisibility(linkedVideo)}
                              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${(linkedVideo.visibility ?? "public") === "internal" ? "border-amber-300 text-amber-600 bg-amber-50" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                              {(linkedVideo.visibility ?? "public") === "internal" ? "🔒 Internal" : "🌐 Public"}
                            </button>
                          );
                        })()}
                        <button onClick={() => { setEditVideo(linkedVideo); setEditTitle(linkedVideo.title); setEditDesc(linkedVideo.description); }}
                          className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1 border border-gray-200 rounded-full transition-colors">
                          Edit
                        </button>
                        <button onClick={startRecording} disabled={recording || uploading}
                          className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1 border border-gray-200 rounded-full transition-colors disabled:opacity-50">
                          Re-record
                        </button>
                        <button onClick={() => handleDelete(linkedVideo)} className="text-xs text-gray-400 hover:text-red-600 px-3 py-1 transition-colors ml-auto">
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : !pendingBlobUrl && !recording && !uploading ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center">
                      <p className="text-sm text-gray-400">No recording yet for this item.</p>
                      <p className="text-xs text-gray-300 mt-1">Hit "Record Screen" above to get started.</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewVideo(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">{previewVideo.title}</h2>
              <button onClick={() => setPreviewVideo(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
            </div>
            <video src={blobSrc(previewVideo.blobUrl)} controls autoPlay className="w-full rounded-xl bg-black" />
          </div>
        </div>
      )}

      {editVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Edit Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor value={editDesc} onChange={setEditDesc} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEditSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2 transition-colors">Save</button>
              <button onClick={() => setEditVideo(null)} className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

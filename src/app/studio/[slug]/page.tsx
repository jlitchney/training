"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { UserMenu } from "@/components/UserMenu";

interface Product {
  id: string;
  name: string;
  slug: string;
  color: string;
  emoji: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  blobUrl: string;
  published: boolean;
  recordedBy: string;
  recordedAt: string;
  duration?: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  videoId?: string;
  order: number;
}

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-green-600",
  orange: "bg-orange-500", pink: "bg-pink-600", teal: "bg-teal-600",
};
const COLOR_TEXT: Record<string, string> = {
  blue: "text-blue-700", purple: "text-purple-700", green: "text-green-700",
  orange: "text-orange-700", pink: "text-pink-700", teal: "text-teal-700",
};
const COLOR_BADGE: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  green: "bg-green-50 border-green-200 text-green-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  pink: "bg-pink-50 border-pink-200 text-pink-700",
  teal: "bg-teal-50 border-teal-200 text-teal-700",
};

function blobSrc(url: string) {
  if (url.includes(".blob.vercel-storage.com")) return `/api/blob?url=${encodeURIComponent(url)}`;
  return url;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StudioProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sidebar
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Recording
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const selectedItemRef = useRef<ChecklistItem | null>(null);

  // Speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  // Save form (inline, after recording)
  const [pendingBlobUrl, setPendingBlobUrl] = useState("");
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
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

  const categories = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of checklist) {
      const cat = item.category?.trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [checklist]);

  const categoryNames = useMemo(() => Array.from(categories.keys()), [categories]);

  const selectedItem = useMemo(
    () => checklist.find((i) => i.id === selectedItemId) ?? null,
    [checklist, selectedItemId]
  );

  // Keep a ref so the recording onstop closure always has the current selection
  useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);

  const linkedVideo = useMemo(
    () => (selectedItem?.videoId ? videos.find((v) => v.id === selectedItem.videoId) ?? null : null),
    [selectedItem, videos]
  );

  const covered = checklist.filter((i) => i.videoId).length;
  const published = videos.filter((v) => v.published).length;
  const colorBg = COLOR_BG[product?.color ?? "blue"] ?? "bg-blue-600";
  const colorBadge = COLOR_BADGE[product?.color ?? "blue"] ?? COLOR_BADGE.blue;
  const colorText = COLOR_TEXT[product?.color ?? "blue"] ?? "text-blue-700";

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function selectItem(id: string) {
    setSelectedItemId(id);
    setPendingBlobUrl("");
    setFormTitle("");
    setFormCategory("");
    setFormDesc("");
    setUploadError("");
  }

  async function handleAddItem() {
    if (!addTitle.trim()) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "add",
          productId: slug,
          title: addTitle.trim(),
          category: addCategory.trim() || undefined,
        }),
      });
      if (res.ok) {
        const item: ChecklistItem = await res.json();
        setChecklist((prev) => [...prev, item]);
        setAddTitle("");
        setAddCategory("");
        setShowAddItem(false);
        selectItem(item.id);
      }
    } finally {
      setAddSaving(false);
    }
  }

  async function uploadBlob(blob: Blob, filename: string): Promise<{ url: string } | null> {
    setUploadError("");
    try {
      const result = await upload(filename, blob, { access: "private", handleUploadUrl: "/api/upload" });
      return { url: result.url };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`Upload failed: ${msg}`);
      return null;
    }
  }

  const startRecording = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      let micStream: MediaStream | null = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* mic denied */ }

      // Start speech recognition on the mic for live transcription
      transcriptRef.current = "";
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const recognition: SpeechRecognition = new SR();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = "en-US";
          recognition.onresult = (e: SpeechRecognitionEvent) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript + " ";
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch { /* speech recognition unavailable */ }

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
          const result = await uploadBlob(videoBlob, `recording-${Date.now()}.webm`);
          if (result) {
            const item = selectedItemRef.current;
            setPendingBlobUrl(result.url);
            setPendingDuration(duration);
            setFormTitle(item?.title ?? "");
            setFormCategory(item?.category ?? "");
            setFormDesc(transcriptRef.current.trim());
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
  }, []);

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  async function generateDescription() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle || selectedItem?.title,
          category: formCategory || selectedItem?.category,
          product: product?.name,
          transcript: formDesc,
        }),
      });
      if (res.ok) {
        const { description } = await res.json();
        if (description) setFormDesc(description);
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
        body: JSON.stringify({
          productId: slug,
          title: formTitle,
          description: formDesc,
          blobUrl: pendingBlobUrl,
          duration: pendingDuration,
        }),
      });
      if (!res.ok) return;
      const video: Video = await res.json();
      setVideos((prev) => [video, ...prev]);

      if (selectedItemId) {
        // Update checklist item title/category if changed
        const orig = selectedItem;
        if (orig && (formTitle !== orig.title || formCategory !== (orig.category ?? ""))) {
          await fetch("/api/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "update",
              productId: slug,
              itemId: selectedItemId,
              title: formTitle,
              category: formCategory || undefined,
            }),
          });
          setChecklist((prev) =>
            prev.map((i) => (i.id === selectedItemId ? { ...i, title: formTitle, category: formCategory || undefined } : i))
          );
        }

        // Link video to checklist item
        await fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link", productId: slug, itemId: selectedItemId, videoId: video.id }),
        });
        setChecklist((prev) =>
          prev.map((item) => (item.id === selectedItemId ? { ...item, videoId: video.id } : item))
        );
      }

      setPendingBlobUrl("");
      setFormTitle("");
      setFormCategory("");
      setFormDesc("");
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
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, published: !v.published } : v)));
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
    setVideos((prev) => prev.map((v) => (v.id === editVideo.id ? { ...v, title: editTitle, description: editDesc } : v)));
    setEditVideo(null);
  }

  async function handleDelete(video: Video) {
    if (!confirm(`Delete "${video.title}"?`)) return;
    await fetch(`/api/videos/${video.id}?productId=${slug}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setChecklist((prev) => prev.map((i) => (i.videoId === video.id ? { ...i, videoId: undefined } : i)));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Studio</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900 text-sm">{product?.emoji} {product?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><strong className={`font-semibold ${colorText}`}>{covered}</strong><span className="text-gray-400">/{checklist.length}</span> covered</span>
              <span><strong className="font-semibold text-green-600">{published}</strong> published</span>
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">

          {/* Sidebar header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Checklist</span>
            <button
              onClick={() => { setShowAddItem((s) => !s); setAddTitle(""); setAddCategory(""); }}
              className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded px-2 py-0.5 transition-colors"
            >
              + Add item
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Item title *"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm mb-2 focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                  if (e.key === "Escape") setShowAddItem(false);
                }}
              />
              <input
                type="text"
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                placeholder="Category (optional)"
                list="cat-list"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm mb-2.5 focus:outline-none focus:border-blue-500"
              />
              <datalist id="cat-list">
                {categoryNames.map((c) => <option key={c} value={c} />)}
              </datalist>
              <div className="flex gap-2">
                <button
                  onClick={handleAddItem}
                  disabled={addSaving || !addTitle.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded py-1.5 transition-colors"
                >
                  {addSaving ? "Adding…" : "Add"}
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-xs rounded py-1.5 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Item list */}
          <div className="flex-1 overflow-y-auto">
            {checklist.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">No items yet.</p>
            ) : (
              Array.from(categories.entries()).map(([cat, items]) => {
                const doneCount = items.filter((i) => i.videoId).length;
                const isCollapsed = collapsed.has(cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
                    >
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate">{cat}</span>
                      <span className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className={`text-xs ${doneCount === items.length ? "text-green-600 font-medium" : "text-gray-400"}`}>
                          {doneCount}/{items.length}
                        </span>
                        <span className={`text-gray-400 text-xs transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                      </span>
                    </button>
                    {!isCollapsed && items.map((item) => {
                      const isSelected = item.id === selectedItemId;
                      const isDone = !!item.videoId;
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectItem(item.id)}
                          className={`w-full text-left flex items-start gap-2.5 px-4 py-2.5 text-sm border-b border-gray-50 transition-colors ${
                            isSelected ? `${colorBg} text-white` : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex-shrink-0 mt-0.5 text-xs leading-none">
                            {isDone ? "✅" : "⬜"}
                          </span>
                          <span className="leading-snug">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right panel ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-base font-medium text-gray-600 mb-1">Select a checklist item</p>
              <p className="text-sm text-gray-400">Click any item in the sidebar to start recording.</p>
            </div>
          ) : (
            <div className="max-w-2xl">

              {/* Item header */}
              <div className="mb-5">
                {selectedItem.category && (
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${colorBadge}`}>
                    {selectedItem.category}
                  </span>
                )}
                <h1 className="text-xl font-bold text-gray-900">{selectedItem.title}</h1>
                {selectedItem.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedItem.description}</p>
                )}
              </div>

              {/* Record / Stop / Uploading */}
              {!pendingBlobUrl && (
                <div className="mb-6">
                  {uploading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin inline-block" />
                      Uploading recording…
                    </div>
                  ) : recording ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className={`flex items-center gap-2 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors ${colorBg}`}
                    >
                      ● Record Screen
                    </button>
                  )}
                  {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
                </div>
              )}

              {/* Inline save form */}
              {pendingBlobUrl && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Save Recording</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <input
                          type="text"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          list="form-cat-list"
                          placeholder="e.g. Workflows"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <datalist id="form-cat-list">
                          {categoryNames.map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-600">Description</label>
                        <button
                          onClick={generateDescription}
                          disabled={generating}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 transition-colors"
                        >
                          {generating ? (
                            <>
                              <span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin inline-block" />
                              Generating…
                            </>
                          ) : (
                            <>✨ Generate with AI</>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                        placeholder={transcriptRef.current ? "Transcribing narration…" : "Describe what this video covers, or use ✨ Generate"}
                      />
                      {formDesc && transcriptRef.current && formDesc === transcriptRef.current.trim() && (
                        <p className="text-xs text-gray-400 mt-1">Transcribed from your narration · use ✨ Generate to polish</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSaveVideo}
                      disabled={saving || !formTitle.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
                    >
                      {saving ? "Saving…" : "Save Video"}
                    </button>
                    <button
                      onClick={() => { setPendingBlobUrl(""); setFormTitle(""); setFormCategory(""); setFormDesc(""); }}
                      className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Linked video card */}
              {linkedVideo ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${linkedVideo.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {linkedVideo.published ? "Published" : "Draft"}
                        </span>
                        {linkedVideo.duration && (
                          <span className="text-xs text-gray-400">{formatDuration(linkedVideo.duration)}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">{linkedVideo.title}</h3>
                      {linkedVideo.description && (
                        <p className="text-sm text-gray-500 mt-1">{linkedVideo.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">
                        by {linkedVideo.recordedBy} · {new Date(linkedVideo.recordedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => setPreviewVideo(linkedVideo)} className="flex-shrink-0 relative group">
                      <video
                        src={blobSrc(linkedVideo.blobUrl)}
                        className="w-32 h-20 rounded object-cover bg-gray-100"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </button>
                  </div>
                  {publishError && <p className="mt-2 text-sm text-red-600">{publishError}</p>}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => togglePublish(linkedVideo)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                        linkedVideo.published
                          ? "border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {linkedVideo.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => { setEditVideo(linkedVideo); setEditTitle(linkedVideo.title); setEditDesc(linkedVideo.description); }}
                      className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1 border border-gray-200 rounded-full transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(linkedVideo)}
                      className="text-xs text-gray-400 hover:text-red-600 px-3 py-1 transition-colors ml-auto"
                    >
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

            </div>
          )}
        </main>
      </div>

      {/* Preview modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">{previewVideo.title}</h2>
              <button onClick={() => setPreviewVideo(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
            </div>
            <video src={blobSrc(previewVideo.blobUrl)} controls autoPlay className="w-full rounded-xl bg-black" />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Edit Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditVideo(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

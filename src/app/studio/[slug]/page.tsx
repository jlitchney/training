"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

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
  videoId?: string;
}

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-green-600",
  orange: "bg-orange-500", pink: "bg-pink-600", teal: "bg-teal-600",
};

function blobSrc(url: string) {
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
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

  // Recording state
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // New video form
  const [showForm, setShowForm] = useState(false);
  const [pendingBlobUrl, setPendingBlobUrl] = useState("");
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChecklistId, setFormChecklistId] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview modal
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Edit modal
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editChecklistId, setEditChecklistId] = useState("");

  // Publish error
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

  async function uploadBlob(blob: Blob, filename: string): Promise<{ url: string } | null> {
    setUploadError("");
    try {
      const result = await upload(filename, blob, {
        access: "private",
        handleUploadUrl: "/api/upload",
      });
      return { url: result.url };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`Upload failed: ${msg}`);
      return null;
    }
  }

  const startRecording = useCallback(async () => {
    try {
      // Capture screen video only (no system audio to avoid background noise)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      let micStream: MediaStream | null = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* mic denied */ }

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
        setRecording(false);
        setUploading(true);
        try {
          const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
          const result = await uploadBlob(videoBlob, `recording-${Date.now()}.webm`);
          if (result) {
            setPendingBlobUrl(result.url);
            setPendingDuration(duration);
            setShowForm(true);
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

  async function handleSaveVideo() {
    if (!formTitle.trim()) return;
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

      // Link to checklist item if selected
      if (formChecklistId) {
        await fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link", productId: slug, itemId: formChecklistId, videoId: video.id }),
        });
        setChecklist((prev) =>
          prev.map((item) => (item.id === formChecklistId ? { ...item, videoId: video.id } : item))
        );
      }

      setShowForm(false);
      setFormTitle("");
      setFormDesc("");
      setFormChecklistId("");
      setPendingBlobUrl("");
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
      setPublishError(`Failed to ${video.published ? "unpublish" : "publish"}: ${err.error ?? res.status}`);
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

    // Handle checklist link change
    const currentLink = checklist.find((i) => i.videoId === editVideo.id);
    const newChecklistId = editChecklistId;
    if (currentLink?.id !== newChecklistId) {
      // Unlink old item
      if (currentLink) {
        await fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link", productId: slug, itemId: currentLink.id, videoId: null }),
        });
        setChecklist((prev) => prev.map((i) => (i.id === currentLink.id ? { ...i, videoId: undefined } : i)));
      }
      // Link new item
      if (newChecklistId) {
        await fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link", productId: slug, itemId: newChecklistId, videoId: editVideo.id }),
        });
        setChecklist((prev) => prev.map((i) => (i.id === newChecklistId ? { ...i, videoId: editVideo.id } : i)));
      }
    }
    setEditVideo(null);
  }

  async function handleDelete(video: Video) {
    if (!confirm(`Delete "${video.title}"?`)) return;
    await fetch(`/api/videos/${video.id}?productId=${slug}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const colorBg = COLOR_BG[product?.color ?? "blue"] ?? "bg-blue-600";
  const unlinkedItems = checklist.filter((item) => !item.videoId);
  const published = videos.filter((v) => v.published).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900">← Studio</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">{product?.emoji} {product?.name}</span>
          </div>
          <span className="text-sm text-gray-500">Hi, {user?.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats + record button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex gap-6 text-sm text-gray-500">
            <span><strong className="text-gray-900">{videos.length}</strong> videos</span>
            <span><strong className="text-green-600">{published}</strong> published</span>
            <span><strong className="text-orange-500">{unlinkedItems.length}</strong> checklist items need videos</span>
          </div>
          <div className="flex gap-2">
            {uploading ? (
              <span className="text-sm text-gray-400 px-4 py-2">Uploading…</span>
            ) : recording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Stop Recording
              </button>
            ) : (
              <button
                onClick={startRecording}
                className={`flex items-center gap-2 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors ${colorBg}`}
              >
                ● Record Screen
              </button>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {uploadError}
          </div>
        )}
        {publishError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {publishError}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checklist */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recording Checklist</h2>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 text-sm ${item.videoId ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">
                      {item.videoId ? "✅" : "⬜"}
                    </span>
                    <span className={item.videoId ? "text-green-800" : "text-gray-700"}>{item.title}</span>
                  </div>
                </div>
              ))}
              {checklist.length === 0 && (
                <p className="text-sm text-gray-400">No checklist items. Add them in Admin.</p>
              )}
            </div>
          </div>

          {/* Videos */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Videos</h2>
            {videos.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-sm">No videos yet. Hit Record to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${video.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {video.published ? "Published" : "Draft"}
                          </span>
                          {video.duration && <span className="text-xs text-gray-400">{formatDuration(video.duration)}</span>}
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm">{video.title}</h3>
                        {video.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">by {video.recordedBy} · {new Date(video.recordedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => setPreviewVideo(video)} className="flex-shrink-0 relative group">
                        <video src={blobSrc(video.blobUrl)} className="w-28 h-16 rounded object-cover bg-gray-100" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-lg">▶</span>
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => togglePublish(video)}
                        className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                          video.published
                            ? "border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600"
                            : "border-green-300 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {video.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => {
                        setEditVideo(video);
                        setEditTitle(video.title);
                        setEditDesc(video.description);
                        const linked = checklist.find((i) => i.videoId === video.id);
                        setEditChecklistId(linked?.id ?? "");
                      }}
                        className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1 border border-gray-200 rounded-full transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(video)}
                        className="text-xs text-gray-400 hover:text-red-600 px-3 py-1 transition-colors ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Save video form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Save Recording</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. How to create a job posting"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="What does this video cover?"
                />
              </div>
              {unlinkedItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to checklist item (optional)</label>
                  <select
                    value={formChecklistId}
                    onChange={(e) => setFormChecklistId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— None —</option>
                    {unlinkedItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveVideo}
                disabled={saving || !formTitle.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                {saving ? "Saving…" : "Save Video"}
              </button>
              <button
                onClick={() => { setShowForm(false); setPendingBlobUrl(""); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewVideo(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">{previewVideo.title}</h2>
              <button onClick={() => setPreviewVideo(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
            </div>
            <video
              src={blobSrc(previewVideo.blobUrl)}
              controls
              autoPlay
              className="w-full rounded-xl bg-black"
            />
          </div>
        </div>
      )}

      {/* Edit video modal */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Checklist item</label>
                <select
                  value={editChecklistId}
                  onChange={(e) => setEditChecklistId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">— None —</option>
                  {checklist.filter((i) => !i.videoId || i.videoId === editVideo?.id).map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
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

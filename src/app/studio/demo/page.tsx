"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { UserMenu } from "@/components/UserMenu";

interface DemoVideo {
  id: string;
  title: string;
  clientName: string;
  notes?: string;
  blobUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  recordedAt: string;
  recordedBy: string;
}

type Step = "idle" | "setup" | "recording" | "preview" | "uploading";
type RecordingMode = "screen" | "camera";

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

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); resolve(null); return; }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => { cleanup(); resolve(blob); }, "image/jpeg", 0.8);
    });
    video.addEventListener("error", () => { clearTimeout(timer); cleanup(); resolve(null); });
  });
}

const BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://training.allstartalent.us";

function buildEmailEmbed(video: DemoVideo): string {
  const link = `${BASE_URL}/demo/${video.id}`;
  const imgSrc = `${BASE_URL}/api/demo-videos/${video.id}/preview-image`;
  const alt = video.title.replace(/"/g, "&quot;");
  return `<a href="${link}" target="_blank" style="display:block;text-decoration:none;border:0"><img src="${imgSrc}" alt="${alt}" width="560" border="0" style="display:block;max-width:100%;border-radius:8px;border:0"></a>`;
}

async function copyRichHtml(html: string) {
  if (navigator.clipboard && window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) }),
    ]);
  } else {
    await navigator.clipboard.writeText(html);
  }
}

export default function DemoStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>("idle");
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlobUrl, setPendingBlobUrl] = useState<string | null>(null);
  const [pendingThumbUrl, setPendingThumbUrl] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClient, setEditClient] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return fetch("/api/demo-videos").then((r) => r.json());
      })
      .then((videos) => { if (videos) setDemoVideos(videos); setLoading(false); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [previewUrl]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    setUploadError("");
    try {
      let stream: MediaStream;
      if (mode === "screen") {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        let micStream: MediaStream | null = null;
        try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* mic denied */ }
        const tracks = [...screenStream.getVideoTracks()];
        if (micStream) tracks.push(...micStream.getAudioTracks());
        stream = new MediaStream(tracks);
        // Handle user clicking browser's "Stop sharing" button
        screenStream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
        };
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      liveStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.play().catch(() => {});
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        stopTimer();
        stream.getTracks().forEach((t) => t.stop());
        liveStreamRef.current = null;
        if (liveVideoRef.current) { liveVideoRef.current.srcObject = null; }

        const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(videoBlob);
        const url = URL.createObjectURL(videoBlob);
        setPreviewUrl(url);
        setPendingDuration(duration);
        setTitle("");
        setClientName("");
        setNotes("");
        setStep("preview");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setStep("recording");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "NotAllowedError") {
        setUploadError(`Could not start recording: ${err.message}`);
      }
    }
  }, [mode, stopTimer]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    stopTimer();
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
    setStep("idle");
    setElapsed(0);
  }, [stopTimer]);

  async function uploadBlob(blob: Blob, filename: string): Promise<string | null> {
    try {
      const result = await upload(filename, blob, { access: "private", handleUploadUrl: "/api/upload" });
      return result.url;
    } catch (err: unknown) {
      setUploadError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async function handleSave() {
    if (!title.trim() || !recordedBlob) return;
    setStep("uploading");
    setUploadError("");

    const ts = Date.now();
    const [thumbBlob, blobUrl] = await Promise.all([
      captureThumbnailFromBlob(recordedBlob),
      uploadBlob(recordedBlob, `demo-${ts}.webm`),
    ]);

    if (!blobUrl) { setStep("preview"); return; }

    let thumbnailUrl: string | undefined;
    if (thumbBlob) {
      const tUrl = await uploadBlob(thumbBlob, `demo-thumb-${ts}.jpg`);
      if (tUrl) thumbnailUrl = tUrl;
    }

    setPendingBlobUrl(blobUrl);
    setPendingThumbUrl(thumbnailUrl ?? null);

    const res = await fetch("/api/demo-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), clientName: clientName.trim(), notes: notes.trim() || undefined, blobUrl, thumbnailUrl, duration: pendingDuration }),
    });

    if (res.ok) {
      const newVideo: DemoVideo = await res.json();
      setDemoVideos((prev) => [newVideo, ...prev]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setRecordedBlob(null);
      setPendingBlobUrl(null);
      setPendingThumbUrl(null);
      setStep("idle");
    } else {
      setUploadError("Failed to save video. Please try again.");
      setStep("preview");
    }
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setPendingBlobUrl(null);
    setPendingThumbUrl(null);
    setStep("idle");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this demo video? This cannot be undone.")) return;
    setDemoVideos((prev) => prev.filter((v) => v.id !== id));
    await fetch(`/api/demo-videos/${id}`, { method: "DELETE" });
  }

  async function handleCopyEmbed(video: DemoVideo) {
    const html = buildEmailEmbed(video);
    await copyRichHtml(html);
    setCopied(video.id);
    setTimeout(() => setCopied((c) => (c === video.id ? null : c)), 2500);
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) return;
    const updated = await fetch(`/api/demo-videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), clientName: editClient.trim() }),
    }).then((r) => r.json());
    setDemoVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
    setEditingId(null);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-black.svg" alt="All-Star Training" className="h-7 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link href="/" className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors">
                Knowledge Base
              </Link>
              <Link href="/studio" className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors">
                Recording Studio
              </Link>
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm">
                Client Demos
              </span>
              <Link href="/learning" className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors">
                Learning Center
              </Link>
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Setup / Recording / Preview / Uploading ── */}
        {step !== "idle" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
            {/* Setup */}
            {step === "setup" && (
              <div className="p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Record a Client Demo</h2>
                <p className="text-sm text-gray-500 mb-6">Choose what you want to record, then click Start.</p>
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setMode("screen")}
                    className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${mode === "screen" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <svg className={`w-8 h-8 ${mode === "screen" ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className={`font-semibold text-sm ${mode === "screen" ? "text-blue-700" : "text-gray-700"}`}>Screen + Mic</p>
                      <p className="text-xs text-gray-400 mt-0.5">Share your screen with audio</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("camera")}
                    className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${mode === "camera" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <svg className={`w-8 h-8 ${mode === "camera" ? "text-blue-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className={`font-semibold text-sm ${mode === "camera" ? "text-blue-700" : "text-gray-700"}`}>Camera + Mic</p>
                      <p className="text-xs text-gray-400 mt-0.5">Record from your webcam</p>
                    </div>
                  </button>
                </div>
                {uploadError && <p className="text-sm text-red-600 mb-4">{uploadError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Start Recording
                  </button>
                  <button onClick={() => setStep("idle")} className="border border-gray-200 text-gray-600 text-sm rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recording in progress */}
            {step === "recording" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-semibold text-gray-900">Recording</span>
                    <span className="text-sm text-gray-500 font-mono">{formatElapsed(elapsed)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <rect x="2" y="2" width="12" height="12" rx="1" />
                      </svg>
                      Stop
                    </button>
                    <button onClick={cancelRecording} className="border border-gray-200 text-gray-500 text-sm rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
                {/* Live preview for camera mode */}
                {mode === "camera" && (
                  <video
                    ref={liveVideoRef}
                    muted
                    playsInline
                    className="w-full max-w-xl mx-auto rounded-xl bg-black aspect-video object-cover"
                  />
                )}
                {mode === "screen" && (
                  <div className="flex items-center justify-center bg-gray-50 rounded-xl py-10 text-gray-400 text-sm">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Screen recording in progress…
                  </div>
                )}
              </div>
            )}

            {/* Preview + save form */}
            {step === "preview" && previewUrl && (
              <div className="p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Review & Save</h2>
                <video src={previewUrl} controls className="w-full rounded-xl bg-black mb-5" style={{ maxHeight: 360 }} />
                <div className="grid gap-4 sm:grid-cols-2 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Video Title <span className="text-red-500">*</span></label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. All-Star Recruiter Overview"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Client Name</label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(internal only)</span></label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Sent after initial demo call"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                {uploadError && <p className="text-sm text-red-600 mb-3">{uploadError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
                  >
                    Save & Upload
                  </button>
                  <button onClick={cancelPreview} className="border border-gray-200 text-gray-600 text-sm rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Uploading */}
            {step === "uploading" && (
              <div className="p-10 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Uploading video…</p>
                <p className="text-xs text-gray-400">This may take a moment depending on length.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Page header + record button ── */}
        {step === "idle" && (
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Client Demos</h1>
              <p className="text-sm text-gray-500">Record a quick demo for a prospect or client. Each video gets a private shareable link you can embed in an email.</p>
            </div>
            <button
              onClick={() => { setUploadError(""); setMode("screen"); setStep("setup"); }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors flex-shrink-0 ml-4"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Record New Demo
            </button>
          </div>
        )}

        {/* ── Video list ── */}
        {step === "idle" && (
          demoVideos.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400 font-medium">No demos recorded yet</p>
              <p className="text-xs text-gray-300 mt-1">Click &ldquo;Record New Demo&rdquo; to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {demoVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 group hover:border-gray-300 hover:shadow-sm transition-all">
                  {/* Thumbnail */}
                  <div className="w-28 h-[4.5rem] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img src={blobSrc(video.thumbnailUrl)} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === video.id ? (
                      <div className="flex gap-2 mb-1">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(video.id); if (e.key === "Escape") setEditingId(null); }}
                          className="text-sm font-semibold text-gray-900 border border-blue-400 rounded px-2 py-0.5 focus:outline-none flex-1 min-w-0"
                        />
                        <input
                          value={editClient}
                          onChange={(e) => setEditClient(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(video.id); if (e.key === "Escape") setEditingId(null); }}
                          placeholder="Client"
                          className="text-sm text-gray-500 border border-blue-400 rounded px-2 py-0.5 focus:outline-none w-32"
                        />
                        <button onClick={() => handleSaveEdit(video.id)} className="text-xs text-blue-600 hover:underline px-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline px-1">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{video.title}</p>
                        {video.clientName && (
                          <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{video.clientName}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(video.recordedAt)}</span>
                      {video.duration && <span>{formatDuration(video.duration)}</span>}
                      {video.notes && <span className="truncate max-w-xs">{video.notes}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleCopyEmbed(video)}
                      title="Copy email embed (paste into Outlook)"
                      className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-all ${
                        copied === video.id
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {copied === video.id ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Copy Embed
                        </>
                      )}
                    </button>

                    <a
                      href={`/demo/${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open shareable link"
                      className="flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Watch
                    </a>

                    <button
                      onClick={() => { setEditingId(video.id); setEditTitle(video.title); setEditClient(video.clientName); }}
                      title="Edit title"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(video.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Usage tip */}
        {step === "idle" && demoVideos.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-6">
            Click <strong>Copy Embed</strong> then paste with <strong>Ctrl+V</strong> into your Outlook email — the thumbnail will appear inline and link to the video.
          </p>
        )}
      </main>
    </div>
  );
}

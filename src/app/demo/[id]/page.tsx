import { notFound } from "next/navigation";
import { getDemoVideo } from "@/lib/kv";
import type { Metadata } from "next";

function blobProxySrc(url: string) {
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = await getDemoVideo(id);
  if (!video) return { title: "Video Not Found" };

  const base = process.env.NEXTAUTH_URL ?? "https://training.allstartalent.us";
  const images = video.thumbnailUrl
    ? [{ url: `${base}/api/blob?url=${encodeURIComponent(video.thumbnailUrl)}`, width: 640 }]
    : [];

  return {
    title: video.title,
    openGraph: {
      title: video.title,
      siteName: "All-Star Talent",
      images,
    },
  };
}

export default async function DemoVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getDemoVideo(id);
  if (!video) notFound();

  const videoSrc = blobProxySrc(video.blobUrl);
  const duration = formatDuration(video.duration);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/10">
        <img src="/logo-white.svg" alt="AllStar Talent" className="h-6 w-auto opacity-80" />
        {duration && (
          <span className="text-xs text-gray-500 font-mono">{duration}</span>
        )}
      </header>

      {/* Video */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <video
            src={videoSrc}
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl ? blobProxySrc(video.thumbnailUrl) : undefined}
            className="w-full rounded-xl bg-black shadow-2xl"
            style={{ maxHeight: "72vh" }}
          />
          <div className="mt-4 px-1">
            <h1 className="text-white text-lg font-semibold">{video.title}</h1>
            {video.notes && (
              <p className="text-gray-400 text-sm mt-1">{video.notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 px-6 py-4 text-center border-t border-white/10">
        <p className="text-xs text-gray-600">
          Shared by <span className="text-gray-500">{video.recordedBy}</span> · All-Star Talent
        </p>
      </footer>
    </div>
  );
}

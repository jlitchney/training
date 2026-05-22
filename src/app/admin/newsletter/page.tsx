"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface User { name: string; role: string; email?: string }

interface NewsletterItem {
  id: string;
  type: "video" | "article";
  productId: string;
  productSlug: string;
  productName: string;
  productColor: string;
  contentId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  articleContent?: string;
}

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  source: "upload" | "signup";
  subscribedAt: string;
  active: boolean;
}

interface SentCampaign {
  id: string;
  subject: string;
  intro?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
  items: NewsletterItem[];
}

interface Product { id: string; name: string; slug: string; emoji: string; color: string }
interface ChecklistItem {
  id: string;
  productId: string;
  title: string;
  description?: string;
  category?: string;
  videoId?: string;
  video?: { id: string; thumbnailUrl?: string };
  type?: "video" | "article";
  articleContent?: string;
}

const COLOR_CLASSES: Record<string, { badge: string }> = {
  blue:    { badge: "bg-blue-100 text-blue-700" },
  indigo:  { badge: "bg-indigo-100 text-indigo-700" },
  violet:  { badge: "bg-violet-100 text-violet-700" },
  purple:  { badge: "bg-purple-100 text-purple-700" },
  pink:    { badge: "bg-pink-100 text-pink-700" },
  rose:    { badge: "bg-rose-100 text-rose-700" },
  red:     { badge: "bg-red-100 text-red-700" },
  orange:  { badge: "bg-orange-100 text-orange-700" },
  amber:   { badge: "bg-amber-100 text-amber-700" },
  lime:    { badge: "bg-lime-100 text-lime-700" },
  green:   { badge: "bg-green-100 text-green-700" },
  emerald: { badge: "bg-emerald-100 text-emerald-700" },
  teal:    { badge: "bg-teal-100 text-teal-700" },
  cyan:    { badge: "bg-cyan-100 text-cyan-700" },
  sky:     { badge: "bg-sky-100 text-sky-700" },
};

function badgeFor(color: string) { return COLOR_CLASSES[color]?.badge ?? "bg-gray-100 text-gray-700"; }

function ContentPickerModal({
  onAdd,
  onClose,
}: {
  onAdd: (item: NewsletterItem) => void;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  async function selectProduct(product: Product) {
    setSelectedProduct(product);
    setLoadingItems(true);
    try {
      const r = await fetch(`/api/checklist?productId=${product.id}`);
      const items: ChecklistItem[] = await r.json();
      setChecklistItems(
        items.filter((i) => (i.type === "article" && i.articleContent) || i.videoId || i.video?.id)
      );
    } finally {
      setLoadingItems(false);
    }
  }

  function addItem(ci: ChecklistItem) {
    if (!selectedProduct) return;
    const isArticle = ci.type === "article";
    const contentId = isArticle ? ci.id : (ci.video?.id ?? ci.videoId ?? ci.id);
    onAdd({
      id: crypto.randomUUID(),
      type: isArticle ? "article" : "video",
      productId: selectedProduct.id,
      productSlug: selectedProduct.slug,
      productName: selectedProduct.name,
      productColor: selectedProduct.color,
      contentId,
      title: ci.title,
      description: ci.description,
      thumbnailUrl: ci.video?.thumbnailUrl,
      category: ci.category,
      articleContent: ci.articleContent,
    });
    onClose();
  }

  const grouped = checklistItems.reduce<Record<string, ChecklistItem[]>>((acc, ci) => {
    const cat = ci.category ?? "Uncategorized";
    (acc[cat] ??= []).push(ci);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Add Content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedProduct ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">Select a product to browse its content:</p>
              <div className="space-y-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-900 flex items-center gap-2"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : loadingItems ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : checklistItems.length === 0 ? (
            <div>
              <button onClick={() => setSelectedProduct(null)} className="text-sm text-blue-600 mb-4 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <p className="text-sm text-gray-400 text-center py-8">No video or article content found.</p>
            </div>
          ) : (
            <div>
              <button onClick={() => setSelectedProduct(null)} className="text-sm text-blue-600 mb-4 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <p className="text-sm font-medium text-gray-700 mb-3">{selectedProduct.emoji} {selectedProduct.name}</p>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
                  <div className="space-y-1">
                    {items.map((ci) => (
                      <button
                        key={ci.id}
                        onClick={() => addItem(ci)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {ci.type === "article"
                            ? <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">Article</span>
                            : <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Video</span>
                          }
                          <span className="text-sm text-gray-900">{ci.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableNewsletterItem({
  item,
  onRemove,
}: {
  item: NewsletterItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg border border-gray-200 p-3 flex items-start gap-3">
      <button {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm-6 6a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.type === "video"
            ? <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Video</span>
            : <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">Article</span>
          }
          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeFor(item.productColor)}`}>{item.productName}</span>
          {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
        </div>
      </div>
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function PreviewModal({ subject, intro, items, onClose }: { subject: string; intro: string; items: NewsletterItem[]; onClose: () => void }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function itemPreview(item: NewsletterItem) {
    const isVideo = item.type === "video";
    const desc = item.description ?? (item.articleContent ? item.articleContent.replace(/<[^>]*>/g, " ").trim().slice(0, 200) : "");
    const url = isVideo ? `${origin}/${item.productSlug}/${item.contentId}` : `${origin}/${item.productSlug}/${encodeURIComponent(item.category ?? "")}`;
    return (
      <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="h-16 flex items-center justify-center text-2xl" style={{ backgroundColor: "#e5e7eb" }}>
          {isVideo ? "▶" : "📄"}
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeFor(item.productColor)}`}>{item.productName}</span>
            {item.category && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.category}</span>}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
          {desc && <p className="text-sm text-gray-500 line-clamp-2">{desc}</p>}
          <a href={url} className="inline-block mt-3 text-sm font-semibold text-blue-600">{isVideo ? "Watch Video →" : "Read Article →"}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900">Preview</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          <div className="mb-4">
            <p className="text-lg font-bold text-gray-900">All-Star Training</p>
            <p className="text-xs text-gray-400">Video Knowledge Base &amp; Guides</p>
          </div>
          {intro && (
            <div className="bg-gray-100 border-l-4 border-gray-400 rounded-r-lg p-4 mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{intro}</p>
            </div>
          )}
          {items.map(itemPreview)}
          <div className="text-center border-t border-gray-200 pt-4 mt-2">
            <p className="text-xs text-gray-400">You&rsquo;re receiving this because you subscribed to All-Star Training updates.</p>
            <p className="text-xs text-blue-400 mt-1">Unsubscribe</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"compose" | "subscribers" | "history">("compose");

  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number } | null>(null);
  const [sendError, setSendError] = useState("");
  const [activeCount, setActiveCount] = useState(0);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addingOne, setAddingOne] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ email: string; name?: string }[] | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaigns, setCampaigns] = useState<SentCampaign[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u) return;
      if (u.role !== "admin") { router.push("/studio"); return; }
      setUser(u);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadSubscribers();
    loadCampaigns();
  }, [user]);

  async function loadSubscribers() {
    setSubLoading(true);
    try {
      const r = await fetch("/api/newsletter/subscribers");
      if (r.ok) {
        const data: Subscriber[] = await r.json();
        setSubscribers(data);
        setActiveCount(data.filter((s) => s.active).length);
      }
    } finally {
      setSubLoading(false);
    }
  }

  async function loadCampaigns() {
    setHistoryLoading(true);
    try {
      const r = await fetch("/api/newsletter/campaigns");
      if (r.ok) setCampaigns(await r.json());
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  }

  async function handleSend() {
    if (!subject || items.length === 0) return;
    setSending(true);
    setSendError("");
    setSendResult(null);
    try {
      const r = await fetch("/api/newsletter/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, intro: intro || undefined, items: items.map(({ id: _id, ...rest }) => rest) }),
      });
      const data = await r.json();
      if (!r.ok) { setSendError(data.error ?? "Failed to send"); return; }
      setSendResult({ sent: data.sent });
      setSubject("");
      setIntro("");
      setItems([]);
      await loadCampaigns();
      await loadSubscribers();
    } catch {
      setSendError("Network error");
    } finally {
      setSending(false);
    }
  }

  async function handleAddOne() {
    if (!addEmail.trim()) return;
    setAddingOne(true);
    try {
      const r = await fetch("/api/newsletter/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "add", email: addEmail.trim(), name: addName.trim() || undefined }),
      });
      if (r.ok) {
        setAddEmail("");
        setAddName("");
        setShowAddForm(false);
        await loadSubscribers();
      }
    } finally {
      setAddingOne(false);
    }
  }

  async function handleRemove(email: string) {
    await fetch("/api/newsletter/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove", email }),
    });
    await loadSubscribers();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows: { email: string; name?: string }[] = [];
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        const email = parts[0];
        if (!email || email.toLowerCase() === "email") continue;
        if (!email.includes("@")) continue;
        rows.push({ email, name: parts[1] || undefined });
      }
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleBulkUpload() {
    if (!csvPreview?.length) return;
    setBulkUploading(true);
    try {
      const r = await fetch("/api/newsletter/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bulk", subscribers: csvPreview }),
      });
      if (r.ok) {
        setCsvPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadSubscribers();
      }
    } finally {
      setBulkUploading(false);
    }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Admin</Link>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-gray-900">Newsletter</span>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Newsletter</h1>
          <span className="text-sm text-gray-500">{activeCount} active subscriber{activeCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="bg-gray-100 rounded-lg p-1 flex gap-1 mb-6 w-fit">
          {(["compose", "subscribers", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "compose" && (
          <div className="space-y-4">
            {sendResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-green-600 text-lg">✓</span>
                <p className="text-sm font-medium text-green-800">Sent to {sendResult.sent} subscriber{sendResult.sent !== 1 ? "s" : ""}.</p>
                <button onClick={() => setSendResult(null)} className="ml-auto text-green-500 hover:text-green-700 text-xs">Dismiss</button>
              </div>
            )}
            {sendError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{sendError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's new at All-Star Training"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intro <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="A short message to kick off the newsletter…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  + Add Content
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400">No content yet. Click &ldquo;+ Add Content&rdquo; to pick videos or articles.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <SortableNewsletterItem
                          key={item.id}
                          item={item}
                          onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPreview(true)}
                disabled={items.length === 0}
                className="border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Send to ${activeCount} active subscriber${activeCount !== 1 ? "s" : ""}?`)) {
                    handleSend();
                  }
                }}
                disabled={!subject || items.length === 0 || sending || activeCount === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors"
              >
                {sending ? "Sending…" : `Send to ${activeCount} subscriber${activeCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {tab === "subscribers" && (
          <div>
            <div className="flex gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 text-center">
                <p className="text-2xl font-bold text-gray-900">{subscribers.length}</p>
                <p className="text-sm text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 text-center">
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                <p className="text-sm text-gray-500 mt-0.5">Active</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 text-center">
                <p className="text-2xl font-bold text-gray-400">{subscribers.length - activeCount}</p>
                <p className="text-sm text-gray-500 mt-0.5">Unsubscribed</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                + Add Single
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                Upload CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {showAddForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex gap-3 mb-3">
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Name (optional)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddOne}
                    disabled={!addEmail.trim() || addingOne}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
                  >
                    {addingOne ? "Adding…" : "Add"}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setAddEmail(""); setAddName(""); }}
                    className="border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {csvPreview && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-900">{csvPreview.length} rows parsed</p>
                  <button onClick={() => { setCsvPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-gray-400 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto mb-3 space-y-1">
                  {csvPreview.slice(0, 10).map((row, i) => (
                    <div key={i} className="flex gap-3 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span className="font-mono">{row.email}</span>
                      {row.name && <span className="text-gray-400">{row.name}</span>}
                    </div>
                  ))}
                  {csvPreview.length > 10 && <p className="text-xs text-gray-400 text-center py-1">+{csvPreview.length - 10} more</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkUpload}
                    disabled={bulkUploading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
                  >
                    {bulkUploading ? "Uploading…" : `Add ${csvPreview.length} subscribers`}
                  </button>
                  <button
                    onClick={() => { setCsvPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {subLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm">No subscribers yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Source</th>
                      <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id} className={`border-b border-gray-100 last:border-0 ${!s.active ? "opacity-40" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs ${!s.active ? "line-through text-gray-400" : "text-gray-900"}`}>{s.email}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{s.name ?? "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.source === "upload" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {s.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(s.subscribedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.active && (
                            <button
                              onClick={() => handleRemove(s.email)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            {historyLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm">No campaigns sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{c.subject}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(c.sentAt).toLocaleString()} &middot; {c.recipientCount} recipient{c.recipientCount !== 1 ? "s" : ""} &middot; {c.sentBy}
                        </p>
                      </div>
                    </div>
                    {c.intro && <p className="text-sm text-gray-500 mb-3 italic">&ldquo;{c.intro.slice(0, 120)}{c.intro.length > 120 ? "…" : ""}&rdquo;</p>}
                    <div className="flex flex-wrap gap-2">
                      {c.items.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                          <span>{item.type === "video" ? "▶" : "📄"}</span>
                          <span>{item.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showPicker && (
        <ContentPickerModal
          onAdd={(item) => setItems((prev) => [...prev, item])}
          onClose={() => setShowPicker(false)}
        />
      )}
      {showPreview && (
        <PreviewModal
          subject={subject}
          intro={intro}
          items={items}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

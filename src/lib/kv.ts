import { v4 as uuidv4 } from "uuid";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;   // e.g. "blue", "purple", "green"
  emoji: string;
  order: number;
}

export interface Video {
  id: string;
  productId: string;
  title: string;
  description: string;
  blobUrl: string;
  published: boolean;
  recordedBy: string;
  recordedAt: string;
  duration?: number; // seconds
  tags?: string[];
}

export interface ChecklistItem {
  id: string;
  productId: string;
  title: string;
  description?: string;
  category?: string;
  videoId?: string;
  order: number;
}

const PRODUCTS_KEY = "training:products:v1";
const hasKV = () =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ── In-memory fallback ──────────────────────────────────────────────
let memProducts: Product[] = [];
let memVideos: Record<string, Video[]> = {};
let memChecklist: Record<string, ChecklistItem[]> = {};

// ── Default seed data ───────────────────────────────────────────────
const DEFAULT_PRODUCTS: Product[] = [
  { id: "all-star-recruiter", name: "All-Star Recruiter", slug: "all-star-recruiter", description: "Full-cycle recruiting platform for finding and placing top talent.", color: "blue", emoji: "⭐", order: 1 },
  { id: "all-star-chatbot", name: "All-Star Chatbot", slug: "all-star-chatbot", description: "AI-powered chatbot for candidate engagement and screening.", color: "purple", emoji: "🤖", order: 2 },
  { id: "all-star-survey-studio", name: "All-Star Survey Studio", slug: "all-star-survey-studio", description: "Survey builder for gathering feedback and insights.", color: "green", emoji: "📋", order: 3 },
];

// Checklist items for All-Star Recruiter (derived from regression test features)
const ASR_CHECKLIST: ChecklistItem[] = [
  { id: "asr-01", productId: "all-star-recruiter", title: "Signing up and creating an account", category: "Getting Started", order: 1 },
  { id: "asr-02", productId: "all-star-recruiter", title: "Logging in and navigating the dashboard", category: "Getting Started", order: 2 },
  { id: "asr-03", productId: "all-star-recruiter", title: "Creating a new job posting", category: "Jobs", order: 3 },
  { id: "asr-04", productId: "all-star-recruiter", title: "Managing and editing job postings", category: "Jobs", order: 4 },
  { id: "asr-05", productId: "all-star-recruiter", title: "Reviewing and filtering applicants", category: "Applicants", order: 5 },
  { id: "asr-06", productId: "all-star-recruiter", title: "Moving candidates through the pipeline", category: "Applicants", order: 6 },
  { id: "asr-07", productId: "all-star-recruiter", title: "Scheduling interviews", category: "Applicants", order: 7 },
  { id: "asr-08", productId: "all-star-recruiter", title: "Sending messages to candidates", category: "Applicants", order: 8 },
  { id: "asr-09", productId: "all-star-recruiter", title: "Using bulk actions on candidates", category: "Applicants", order: 9 },
  { id: "asr-10", productId: "all-star-recruiter", title: "Setting up your company profile", category: "Settings", order: 10 },
  { id: "asr-11", productId: "all-star-recruiter", title: "Configuring email notifications", category: "Settings", order: 11 },
  { id: "asr-12", productId: "all-star-recruiter", title: "Adding and managing team members", category: "Settings", order: 12 },
  { id: "asr-13", productId: "all-star-recruiter", title: "Using the candidate search and filters", category: "Search & Reports", order: 13 },
  { id: "asr-14", productId: "all-star-recruiter", title: "Exporting reports and data", category: "Search & Reports", order: 14 },
  { id: "asr-15", productId: "all-star-recruiter", title: "Managing integrations", category: "Settings", order: 15 },
].map((item) => ({ description: "", ...item }));

// ── KV helpers ──────────────────────────────────────────────────────
async function kv() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

// ── Products ────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  if (!hasKV()) {
    if (memProducts.length === 0) memProducts = [...DEFAULT_PRODUCTS];
    return [...memProducts].sort((a, b) => a.order - b.order);
  }
  try {
    const db = await kv();
    const products = await db.get<Product[]>(PRODUCTS_KEY);
    if (!products || products.length === 0) {
      await db.set(PRODUCTS_KEY, DEFAULT_PRODUCTS);
      return [...DEFAULT_PRODUCTS];
    }
    return [...products].sort((a, b) => a.order - b.order);
  } catch {
    return [...DEFAULT_PRODUCTS];
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug) ?? null;
}

export async function saveProducts(products: Product[]): Promise<void> {
  if (!hasKV()) { memProducts = products; return; }
  const db = await kv();
  await db.set(PRODUCTS_KEY, products);
}

export async function createProduct(product: Omit<Product, "id" | "order">): Promise<Product> {
  const products = await getProducts();
  const newProduct: Product = {
    ...product,
    id: product.slug,
    order: products.length + 1,
  };
  await saveProducts([...products, newProduct]);
  return newProduct;
}

export async function updateProduct(slug: string, patch: Partial<Product>): Promise<Product | null> {
  const products = await getProducts();
  const idx = products.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;
  const updated = { ...products[idx], ...patch };
  products[idx] = updated;
  await saveProducts(products);
  return updated;
}

export async function deleteProduct(slug: string): Promise<void> {
  const products = await getProducts();
  await saveProducts(products.filter((p) => p.slug !== slug));
}

// ── Videos ──────────────────────────────────────────────────────────
// Each video stored as its own key. There is NO separate ID-list key.
// getVideos derives the set of video IDs from the checklist — the
// checklist is a single key per product and has proven reliable under
// Vercel KV's global eventual-consistency replication. Since the
// checklist link is always written AFTER the video is saved, if the
// checklist says videoId=X then training:video:X is guaranteed to exist.
function videoKey(videoId: string) { return `training:video:${videoId}`; }

export async function getVideos(productId: string, publishedOnly = false): Promise<Video[]> {
  const checklist = await getChecklist(productId);
  const videoIds = [...new Set(checklist.filter((i) => i.videoId).map((i) => i.videoId!))];
  if (videoIds.length === 0) return [];

  if (!hasKV()) {
    const all = (memVideos[productId] ?? []);
    const videos = videoIds.map((id) => all.find((v) => v.id === id)).filter(Boolean) as Video[];
    return publishedOnly ? videos.filter((v) => v.published) : videos;
  }
  try {
    const db = await kv();
    const raw = await db.mget<(Video | null)[]>(...videoIds.map(videoKey));
    const videos = raw.filter((v): v is Video => v !== null);
    return publishedOnly ? videos.filter((v) => v.published) : videos;
  } catch {
    return [];
  }
}

export async function getVideo(productId: string, videoId: string): Promise<Video | null> {
  if (!hasKV()) return (memVideos[productId] ?? []).find((v) => v.id === videoId) ?? null;
  try {
    const db = await kv();
    return await db.get<Video>(videoKey(videoId));
  } catch {
    return null;
  }
}

export async function createVideo(video: Omit<Video, "id" | "recordedAt">): Promise<Video> {
  const newVideo: Video = {
    ...video,
    id: uuidv4(),
    recordedAt: new Date().toISOString(),
  };
  if (!hasKV()) {
    memVideos[video.productId] = [newVideo, ...(memVideos[video.productId] ?? [])];
    return newVideo;
  }
  const db = await kv();
  await db.set(videoKey(newVideo.id), newVideo);
  return newVideo;
}

export async function updateVideo(productId: string, videoId: string, patch: Partial<Video>): Promise<Video | null> {
  if (!hasKV()) {
    const videos = memVideos[productId] ?? [];
    const idx = videos.findIndex((v) => v.id === videoId);
    if (idx === -1) return null;
    videos[idx] = { ...videos[idx], ...patch };
    return videos[idx];
  }
  const db = await kv();
  const existing = await db.get<Video>(videoKey(videoId));
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await db.set(videoKey(videoId), updated);
  return updated;
}

export async function deleteVideo(productId: string, videoId: string): Promise<void> {
  if (!hasKV()) {
    memVideos[productId] = (memVideos[productId] ?? []).filter((v) => v.id !== videoId);
    return;
  }
  const db = await kv();
  await db.del(videoKey(videoId));
  // Clear the checklist link so coverage counts stay accurate after deletion
  const items = await getChecklist(productId);
  const updated = items.map((i) => (i.videoId === videoId ? { ...i, videoId: undefined } : i));
  await saveChecklist(productId, updated);
}

// ── Checklist ────────────────────────────────────────────────────────
function checklistKey(productId: string) {
  return `training:checklist:${productId}`;
}

export async function getChecklist(productId: string): Promise<ChecklistItem[]> {
  if (!hasKV()) {
    if (!memChecklist[productId]) {
      memChecklist[productId] = productId === "all-star-recruiter" ? [...ASR_CHECKLIST] : [];
    }
    return memChecklist[productId];
  }
  try {
    const db = await kv();
    const items = await db.get<ChecklistItem[]>(checklistKey(productId));
    if (!items) {
      const seed = productId === "all-star-recruiter" ? ASR_CHECKLIST : [];
      if (seed.length > 0) await db.set(checklistKey(productId), seed);
      return seed;
    }
    return items;
  } catch {
    return [];
  }
}

export async function saveChecklist(productId: string, items: ChecklistItem[]): Promise<void> {
  if (!hasKV()) { memChecklist[productId] = items; return; }
  const db = await kv();
  await db.set(checklistKey(productId), items);
}

export async function addChecklistItem(productId: string, title: string, description?: string, category?: string): Promise<ChecklistItem> {
  const items = await getChecklist(productId);
  const newItem: ChecklistItem = {
    id: uuidv4(),
    productId,
    title,
    description: description ?? "",
    category,
    order: items.length + 1,
  };
  await saveChecklist(productId, [...items, newItem]);
  return newItem;
}

export async function updateChecklistItem(productId: string, itemId: string, patch: Partial<Pick<ChecklistItem, "title" | "description" | "category">>): Promise<ChecklistItem | null> {
  const items = await getChecklist(productId);
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return null;
  const updated = { ...items[idx], ...patch };
  items[idx] = updated;
  await saveChecklist(productId, items);
  return updated;
}

export async function linkChecklistVideo(productId: string, itemId: string, videoId: string | null): Promise<void> {
  const items = await getChecklist(productId);
  const updated = items.map((item) =>
    item.id === itemId ? { ...item, videoId: videoId ?? undefined } : item
  );
  await saveChecklist(productId, updated);
}

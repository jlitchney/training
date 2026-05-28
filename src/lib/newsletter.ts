import { v4 as uuidv4 } from "uuid";

export const COLOR_HEX: Record<string, { bg: string; light: string; text: string }> = {
  blue:    { bg: "#2563eb", light: "#dbeafe", text: "#1d4ed8" },
  indigo:  { bg: "#4f46e5", light: "#e0e7ff", text: "#4338ca" },
  violet:  { bg: "#7c3aed", light: "#ede9fe", text: "#6d28d9" },
  purple:  { bg: "#9333ea", light: "#f3e8ff", text: "#7e22ce" },
  pink:    { bg: "#db2777", light: "#fce7f3", text: "#be185d" },
  rose:    { bg: "#e11d48", light: "#ffe4e6", text: "#be123c" },
  red:     { bg: "#dc2626", light: "#fee2e2", text: "#b91c1c" },
  orange:  { bg: "#ea580c", light: "#ffedd5", text: "#c2410c" },
  amber:   { bg: "#d97706", light: "#fef3c7", text: "#b45309" },
  lime:    { bg: "#65a30d", light: "#ecfccb", text: "#4d7c0f" },
  green:   { bg: "#16a34a", light: "#dcfce7", text: "#15803d" },
  emerald: { bg: "#059669", light: "#d1fae5", text: "#047857" },
  teal:    { bg: "#0d9488", light: "#ccfbf1", text: "#0f766e" },
  cyan:    { bg: "#0891b2", light: "#cffafe", text: "#0e7490" },
  sky:     { bg: "#0284c7", light: "#e0f2fe", text: "#0369a1" },
};

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  source: "upload" | "signup" | "crm";
  subscribedAt: string;
  active: boolean;
}

export interface NewsletterItem {
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

export interface SentCampaign {
  id: string;
  subject: string;
  intro?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
  items: NewsletterItem[];
}

const SUBSCRIBERS_KEY = "newsletter:subscribers";
const CAMPAIGNS_KEY = "newsletter:campaigns";

const hasKV = () =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let memSubscribers: Subscriber[] = [];
let memCampaigns: SentCampaign[] = [];

async function kv() {
  const { createClient } = await import("@vercel/kv");
  return createClient({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
    cache: "no-store",
  });
}

export async function getSubscribers(): Promise<Subscriber[]> {
  if (!hasKV()) return [...memSubscribers];
  try {
    const db = await kv();
    return (await db.get<Subscriber[]>(SUBSCRIBERS_KEY)) ?? [];
  } catch { return []; }
}

export async function saveSubscribers(subscribers: Subscriber[]): Promise<void> {
  if (!hasKV()) { memSubscribers = subscribers; return; }
  const db = await kv();
  await db.set(SUBSCRIBERS_KEY, subscribers);
}

export async function getCampaigns(): Promise<SentCampaign[]> {
  if (!hasKV()) return [...memCampaigns];
  try {
    const db = await kv();
    return (await db.get<SentCampaign[]>(CAMPAIGNS_KEY)) ?? [];
  } catch { return []; }
}

export async function saveCampaigns(campaigns: SentCampaign[]): Promise<void> {
  if (!hasKV()) { memCampaigns = campaigns; return; }
  const db = await kv();
  await db.set(CAMPAIGNS_KEY, campaigns);
}

export function newSubscriber(email: string, name: string | undefined, source: "upload" | "signup" | "crm"): Subscriber {
  return {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    name: name?.trim() || undefined,
    source,
    subscribedAt: new Date().toISOString(),
    active: true,
  };
}

function c(color: string) { return COLOR_HEX[color] ?? COLOR_HEX.blue; }

function itemCard(item: NewsletterItem, origin: string): string {
  const col = c(item.productColor);
  const isVideo = item.type === "video";
  const url = isVideo
    ? `${origin}/${item.productSlug}/${item.contentId}`
    : `${origin}/${item.productSlug}/${encodeURIComponent(item.category ?? "")}`;
  const ctaLabel = isVideo ? "Watch Video &rarr;" : "Read Article &rarr;";
  const desc = (item.description || item.articleContent || "")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);

  const thumbSrc = item.thumbnailUrl
    ? (item.thumbnailUrl.includes(".blob.vercel-storage.com")
        ? `${origin}/api/blob?url=${encodeURIComponent(item.thumbnailUrl)}`
        : item.thumbnailUrl)
    : null;

  const thumbHtml = isVideo && thumbSrc ? `
    <td width="130" style="padding:14px 0 14px 16px;vertical-align:top;">
      <a href="${url}" style="display:block;text-decoration:none;">
        <img src="${thumbSrc}" alt="${item.title.replace(/"/g, "&quot;")}" width="130" height="73"
          style="display:block;border-radius:7px;object-fit:cover;border:1px solid #e5e7eb;" />
      </a>
    </td>
    <td style="width:10px;font-size:0;line-height:0;padding:0;">&nbsp;</td>
  ` : "";

  const contentPad = isVideo && thumbSrc ? "14px 16px 14px 0" : "16px 18px";

  return `
    <tr><td style="padding:0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;border-top:3px solid ${col.bg};overflow:hidden;">
        <tr>
          ${thumbHtml}
          <td style="padding:${contentPad};vertical-align:top;">
            <div style="margin-bottom:8px;">
              <span style="display:inline-block;background:${col.light};color:${col.text};font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;letter-spacing:0.01em;">
                ${item.productName}
              </span>
              ${item.category ? `<span style="display:inline-block;background:#f3f4f6;color:#6b7280;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;margin-left:4px;">${item.category}</span>` : ""}
            </div>
            <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">
              ${item.title}
            </p>
            ${desc ? `<p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;line-height:1.55;">${desc.slice(0, 100)}${desc.length > 100 ? "…" : ""}</p>` : `<div style="margin-bottom:10px;"></div>`}
            <a href="${url}" style="display:inline-block;background:${col.bg};color:#ffffff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:6px;text-decoration:none;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

export function buildNewsletterEmail({
  subject,
  intro,
  items,
  recipientEmail,
  origin,
}: {
  subject: string;
  intro?: string;
  items: NewsletterItem[];
  recipientEmail: string;
  origin: string;
}): string {
  const unsubUrl = `${origin}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
  const introHtml = intro
    ? `<tr><td style="padding:0 0 24px 0;">
        <div style="background:#f9fafb;border-left:3px solid #6b7280;border-radius:0 8px 8px 0;padding:14px 16px;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${intro.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
        </div>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="padding:0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:14px;overflow:hidden;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 2px 0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">All-Star Training</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">Video Knowledge Base &amp; Guides</p>
          </td></tr>
        </table>
      </td></tr>

      ${introHtml}

      ${items.map((item) => itemCard(item, origin)).join("")}

      <!-- Footer -->
      <tr><td style="padding:8px 0 0 0;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:16px 0 4px 0;font-size:12px;color:#9ca3af;line-height:1.5;">
          You&rsquo;re receiving this because you subscribed to All-Star Training updates.
        </p>
        <a href="${unsubUrl}" style="font-size:12px;color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
        <p style="margin:12px 0 0 0;font-size:11px;color:#d1d5db;">All-Star Talent &middot; training.allstartalent.us</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

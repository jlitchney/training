import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getProduct, getVideo, getVideos, getChecklist } from "@/lib/kv";
import { getBrandLabel } from "@/lib/brandIcons";

const COLOR_HEX: Record<string, { bg: string; light: string; text: string }> = {
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

function c(color: string) { return COLOR_HEX[color] ?? COLOR_HEX.blue; }

function buildText({
  product, video, category, relatedVideos, message, origin,
}: {
  product: { name: string; slug: string; color: string; emoji: string };
  video: { id: string; title: string; description?: string };
  category: string;
  relatedVideos: { id: string; title: string }[];
  message?: string;
  origin: string;
}) {
  const videoUrl = `${origin}/${product.slug}/${video.id}`;
  const lines: string[] = [];
  if (message) { lines.push(message, ""); }
  lines.push(video.title);
  if (video.description) lines.push(video.description);
  lines.push("", `Watch: ${videoUrl}`);
  if (relatedVideos.length > 0) {
    lines.push("", `More in ${category}:`);
    for (const v of relatedVideos) {
      lines.push(`- ${v.title}`, `  ${origin}/${product.slug}/${v.id}`);
    }
  }
  lines.push("", `— All-Star Training (${origin}/${product.slug})`);
  return lines.join("\n");
}

function buildEmail({
  product, video, category, relatedVideos, message, origin,
}: {
  product: { name: string; slug: string; color: string; emoji: string };
  video: { id: string; title: string; description?: string; thumbnailUrl?: string };
  category: string;
  relatedVideos: { id: string; title: string }[];
  message?: string;
  origin: string;
}) {
  const col = c(product.color);
  const videoUrl = `${origin}/${product.slug}/${video.id}`;
  const categoryUrl = `${origin}/${product.slug}/${encodeURIComponent(category)}`;
  const productUrl = `${origin}/${product.slug}`;

  const thumbnailHtml = video.thumbnailUrl ? `
    <tr><td style="padding:0;line-height:0;font-size:0;">
      <a href="${videoUrl}" style="display:block;text-decoration:none;">
        <img src="${video.thumbnailUrl}" alt="${video.title.replace(/"/g, "&quot;")}" width="560"
          style="width:100%;max-width:560px;height:auto;display:block;" />
      </a>
    </td></tr>
    <tr><td style="background:${col.bg};height:4px;font-size:0;line-height:0;padding:0;">&nbsp;</td></tr>
  ` : `
    <tr><td style="background:${col.bg};padding:36px;text-align:center;">
      <div style="display:inline-block;width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;line-height:60px;text-align:center;font-size:24px;color:white;">
        &#9654;
      </div>
    </td></tr>
  `;

  const relatedHtml = relatedVideos.length > 0 ? `
    <tr><td style="padding:0 0 8px 0;">
      <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">
        More in ${category}
      </p>
      ${relatedVideos.map((v) => `
        <a href="${origin}/${product.slug}/${v.id}"
          style="display:block;padding:11px 14px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:7px;text-decoration:none;color:#111827;font-size:13px;font-weight:500;line-height:1.4;">
          <span style="color:${col.bg};margin-right:8px;">&#9654;</span>${v.title}
        </a>
      `).join("")}
    </td></tr>` : "";

  const messageHtml = message ? `
    <tr><td style="padding:0 0 24px 0;">
      <div style="background:#f9fafb;border-left:3px solid ${col.bg};border-radius:0 8px 8px 0;padding:14px 16px;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    </td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${video.title}</title>
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

      <!-- Video card -->
      <tr><td style="padding:0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">

          ${thumbnailHtml}

          <!-- Card content -->
          <tr><td style="padding:20px 22px 24px 22px;">

            <!-- Product badge -->
            <div style="margin-bottom:12px;">
              <span style="display:inline-block;background:${col.light};color:${col.text};font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">
                ${getBrandLabel(product.emoji)} ${product.name}
              </span>
              <span style="display:inline-block;background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;margin-left:5px;">
                ${category}
              </span>
            </div>

            <!-- Title -->
            <h1 style="margin:0 0 10px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
              ${video.title}
            </h1>

            ${video.description ? `
            <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;line-height:1.65;">
              ${video.description}
            </p>` : `<div style="margin-bottom:20px;"></div>`}

            <!-- CTA -->
            <a href="${videoUrl}"
              style="display:inline-block;background:${col.bg};color:#ffffff;font-size:13px;font-weight:700;padding:11px 22px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
              Watch Video &rarr;
            </a>

          </td></tr>
        </table>
      </td></tr>

      ${messageHtml}
      ${relatedHtml}

      <!-- Footer links -->
      <tr><td style="padding:4px 0 0 0;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:14px 0 6px 0;">
          <a href="${categoryUrl}" style="font-size:13px;color:#6b7280;text-decoration:none;">Browse ${category}</a>
          <span style="color:#d1d5db;margin:0 10px;">·</span>
          <a href="${productUrl}" style="font-size:13px;color:#6b7280;text-decoration:none;">All ${product.name} videos</a>
        </p>
        <p style="margin:0;font-size:11px;color:#d1d5db;">All-Star Talent &middot; training.allstartalent.us</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const { to, videoId, slug, category, message } = await req.json();
  if (!to || !videoId || !slug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://training.allstartalent.us";

  const [product, video, checklist] = await Promise.all([
    getProduct(slug),
    getVideo(slug, videoId),
    getChecklist(slug),
  ]);

  if (!product || !video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build videoId → category map and find related videos
  const catMap: Record<string, string> = {};
  for (const item of checklist) {
    if (!item.category) continue;
    const id = item.video?.id ?? item.videoId;
    if (id) catMap[id] = item.category;
  }

  const allVideos = await getVideos(slug, true);
  const related = allVideos
    .filter((v) => v.id !== videoId && catMap[v.id] === category)
    .slice(0, 4);

  const emailArgs = {
    product,
    video: { id: video.id, title: video.title, description: video.description, thumbnailUrl: video.thumbnailUrl },
    category: category ?? "Training",
    relatedVideos: related,
    message,
    origin,
  };
  const html = buildEmail(emailArgs);
  const text = buildText(emailArgs);

  const resend = new Resend(apiKey);
  const fromEmail = process.env.SHARE_FROM_EMAIL ?? "noreply@send.training.allstartalent.us";

  const { error } = await resend.emails.send({
    from: `All-Star Training <${fromEmail}>`,
    to,
    subject: video.title,
    html,
    text,
  });

  if (error) {
    console.error("Resend error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send", detail: (error as { message?: string }).message ?? JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ORANGE = "#f07b00";
const BLUE = "#4d65ff";
const DARK = "#0a0a0a";
const DARK2 = "#111827";

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ── Template 1: Cinematic ──────────────────────────────────────────────────
   Full-bleed thumbnail with dark vignette, orange badge top-left, bold
   white title at bottom. Dramatic, high-impact feel.                       */
function tpl1(img: string | null, title: string, sub: string) {
  const fs = title.length > 55 ? 46 : title.length > 35 ? 54 : 62;
  return (
    <div style={{ display: "flex", width: 1200, height: 630, background: DARK, position: "relative", overflow: "hidden" }}>
      {img && (
        <img src={img} width={1200} height={630}
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover", opacity: 0.7 }} />
      )}
      {/* vignette */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, rgba(0,0,0,0.9) 100%)", display: "flex" }} />
      {/* orange top-left badge */}
      <div style={{ position: "absolute", top: 40, left: 44, display: "flex", alignItems: "center", background: ORANGE, padding: "10px 22px", borderRadius: 8 }}>
        <span style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "0.05em" }}>★ ALL-STAR TRAINING</span>
      </div>
      {/* bottom content */}
      <div style={{ position: "absolute", bottom: 44, left: 48, right: 48, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em" }}>
          {clip(title, 72)}
        </div>
        <div style={{ display: "flex", marginTop: 18, alignItems: "center" }}>
          <div style={{ display: "flex", width: 56, height: 4, background: ORANGE, borderRadius: 2 }} />
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 20, marginLeft: 18 }}>{sub}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Template 2: Bold Split Panel ───────────────────────────────────────────
   Left dark panel (orange accent bar) with branding + title. Right: full
   thumbnail. Clean, editorial, great for LinkedIn.                         */
function tpl2(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 38 : title.length > 35 ? 44 : 50;
  return (
    <div style={{ display: "flex", width: 1200, height: 630, background: DARK2, overflow: "hidden" }}>
      {/* Left panel */}
      <div style={{ display: "flex", flexDirection: "column", width: 500, background: DARK, padding: "52px 48px 52px 56px", justifyContent: "center", position: "relative" }}>
        {/* Orange left-edge accent */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 6, background: ORANGE, display: "flex" }} />
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", width: 34, height: 34, background: ORANGE, borderRadius: "50%", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>★</span>
          </div>
          <span style={{ color: ORANGE, fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>ALL-STAR TRAINING</span>
        </div>
        {/* Title */}
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          {clip(title, 68)}
        </div>
        <div style={{ display: "flex", width: 48, height: 4, background: ORANGE, borderRadius: 2, marginTop: 28 }} />
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, marginTop: 20 }}>{sub}</span>
      </div>
      {/* Right: thumbnail */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {img ? (
          <img src={img} width={700} height={630}
            style={{ width: 700, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", background: DARK2 }}>
            <span style={{ color: ORANGE, fontSize: 160, opacity: 0.2 }}>★</span>
          </div>
        )}
        {/* blue bottom strip */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: BLUE, display: "flex" }} />
      </div>
    </div>
  );
}

/* ── Template 3: Blue Header + Side-by-Side ─────────────────────────────────
   Blue top banner, thumbnail right, bold title left on dark bg. Great for
   Facebook / professional tone.                                             */
function tpl3(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 38 : title.length > 35 ? 44 : 50;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, background: DARK, overflow: "hidden" }}>
      {/* Blue header */}
      <div style={{ display: "flex", background: BLUE, padding: "18px 48px", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: "0.04em" }}>★ ALL-STAR TRAINING</span>
        <div style={{ flex: 1, display: "flex" }} />
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 18 }}>{sub}</span>
      </div>
      {/* Body */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left: title */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 48px", flex: 1 }}>
          <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {clip(title, 68)}
          </div>
          <div style={{ display: "flex", marginTop: 28, alignItems: "center" }}>
            <div style={{ display: "flex", width: 48, height: 4, background: ORANGE, borderRadius: 2 }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 17, marginLeft: 16 }}>training.allstartalent.us</span>
          </div>
        </div>
        {/* Right: thumbnail */}
        {img && (
          <div style={{ display: "flex", width: 520, padding: "28px 40px 28px 0", alignItems: "center" }}>
            <img src={img} width={480} height={270}
              style={{ width: 480, height: 270, objectFit: "cover", borderRadius: 12, border: "3px solid rgba(255,255,255,0.1)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Template 4: Star Power Poster ──────────────────────────────────────────
   Dark bg with large star watermark. Thumbnail fades in from the right.
   Orange vertical accent bar, big title on the left. Energetic / bold.    */
function tpl4(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 40 : title.length > 35 ? 48 : 56;
  return (
    <div style={{ display: "flex", width: 1200, height: 630, background: "#0f0f0f", overflow: "hidden", position: "relative" }}>
      {/* Star watermark */}
      <div style={{ position: "absolute", top: -120, right: -60, color: ORANGE, fontSize: 600, opacity: 0.055, display: "flex", lineHeight: 1 }}>★</div>
      {/* Thumbnail — right half, fades left */}
      {img && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 660, display: "flex", overflow: "hidden" }}>
          <img src={img} width={660} height={630}
            style={{ width: 660, height: 630, objectFit: "cover", opacity: 0.55 }} />
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, background: "linear-gradient(to right, #0f0f0f 0%, rgba(15,15,15,0.5) 45%, transparent 100%)", display: "flex" }} />
        </div>
      )}
      {/* Content */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 660, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", width: 6, height: 44, background: ORANGE, borderRadius: 3, marginRight: 18 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: ORANGE, fontSize: 16, fontWeight: 800, letterSpacing: "0.12em" }}>ALL-STAR TRAINING</span>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 3 }}>{sub}</span>
          </div>
        </div>
        {/* Title */}
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.025em" }}>
          {clip(title, 72)}
        </div>
        {/* Bottom accent */}
        <div style={{ display: "flex", marginTop: 32, alignItems: "center" }}>
          <div style={{ display: "flex", width: 40, height: 4, background: ORANGE, borderRadius: 2 }} />
          <div style={{ display: "flex", width: 20, height: 4, background: BLUE, borderRadius: 2, marginLeft: 6 }} />
          <div style={{ display: "flex", width: 10, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, marginLeft: 6 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Template 5: Top Strip ───────────────────────────────────────────────────
   Thumbnail spans full width at top, orange separator, bold title on dark
   lower section. Clean horizontal editorial feel.                          */
function tpl5(img: string | null, title: string, sub: string) {
  const fs = title.length > 55 ? 40 : title.length > 35 ? 48 : 56;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, background: DARK, overflow: "hidden" }}>
      {/* Thumbnail top */}
      <div style={{ display: "flex", width: 1200, height: 330, overflow: "hidden", position: "relative" }}>
        {img ? (
          <img src={img} width={1200} height={330}
            style={{ width: 1200, height: 330, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", width: 1200, height: 330, background: DARK2, alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: ORANGE, fontSize: 100, opacity: 0.2 }}>★</span>
          </div>
        )}
        {/* bottom fade into separator */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", display: "flex" }} />
      </div>
      {/* Orange separator */}
      <div style={{ display: "flex", height: 5, background: ORANGE }} />
      {/* Bottom text section */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", padding: "18px 52px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: ORANGE, fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}>★ ALL-STAR TRAINING</span>
          <div style={{ flex: 1, display: "flex" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 15 }}>{sub}</span>
        </div>
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.025em" }}>
          {clip(title, 72)}
        </div>
        <div style={{ display: "flex", marginTop: 14, alignItems: "center" }}>
          <div style={{ display: "flex", width: 44, height: 4, background: ORANGE, borderRadius: 2 }} />
          <div style={{ display: "flex", width: 24, height: 4, background: BLUE, borderRadius: 2, marginLeft: 6 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Template 6: Atmospheric ─────────────────────────────────────────────────
   Very dark bg with a subtle orange radial glow on the left. Title on the
   left, thumbnail card framed in a faint orange border on the right.
   Moody, cinematic side-by-side with depth.                               */
function tpl6(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 38 : title.length > 35 ? 44 : 52;
  return (
    <div style={{ display: "flex", width: 1200, height: 630, background: "#050508", overflow: "hidden", position: "relative" }}>
      {/* Radial orange glow */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 20% 55%, rgba(240,123,0,0.16) 0%, transparent 58%)", display: "flex" }} />
      {/* Left content */}
      <div style={{ display: "flex", flexDirection: "column", width: 560, justifyContent: "center", padding: "0 56px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 26 }}>
          <div style={{ display: "flex", width: 5, height: 40, background: ORANGE, borderRadius: 3, marginRight: 14 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: ORANGE, fontSize: 15, fontWeight: 700, letterSpacing: "0.1em" }}>ALL-STAR TRAINING</span>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 2 }}>{sub}</span>
          </div>
        </div>
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          {clip(title, 65)}
        </div>
        <div style={{ display: "flex", marginTop: 28, alignItems: "center" }}>
          <div style={{ display: "flex", width: 36, height: 3, background: ORANGE, borderRadius: 2 }} />
          <div style={{ display: "flex", width: 20, height: 3, background: BLUE, borderRadius: 2, marginLeft: 5 }} />
          <div style={{ display: "flex", width: 10, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, marginLeft: 5 }} />
        </div>
      </div>
      {/* Right: framed thumbnail */}
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "40px 40px 40px 0" }}>
        <div style={{ display: "flex", width: 530, height: 490, overflow: "hidden", borderRadius: 18, border: `2px solid rgba(240,123,0,0.35)`, position: "relative" }}>
          {img ? (
            <img src={img} width={530} height={490}
              style={{ width: 530, height: 490, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", width: 530, height: 490, background: DARK2, alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: ORANGE, fontSize: 120, opacity: 0.25 }}>★</span>
            </div>
          )}
          {/* Subtle corner gradient */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, rgba(240,123,0,0.12) 0%, transparent 45%)", display: "flex" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Template 7: Light Card ──────────────────────────────────────────────────
   Bright white/light-gray background — a bold contrast to the other dark
   templates. Blue top bar, orange pill label, dark bold title, thumbnail
   with a clean white border. Stands out in a dark social media feed.      */
function tpl7(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 36 : title.length > 35 ? 42 : 50;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, background: "#eef2f7", overflow: "hidden" }}>
      {/* Blue header bar */}
      <div style={{ display: "flex", background: BLUE, padding: "16px 52px", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 24, fontWeight: 800, letterSpacing: "0.04em" }}>★ ALL-STAR TRAINING</span>
        <div style={{ flex: 1, display: "flex" }} />
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 17 }}>{sub}</span>
      </div>
      {/* Body */}
      <div style={{ display: "flex", flex: 1, padding: "32px 52px", alignItems: "center" }}>
        {/* Left text */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: img ? 44 : 0 }}>
          <div style={{ display: "flex", background: ORANGE, padding: "6px 16px", borderRadius: 7, marginBottom: 22, alignSelf: "flex-start" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.04em" }}>Training Content</span>
          </div>
          <div style={{ display: "flex", color: "#0f172a", fontSize: fs, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.025em" }}>
            {clip(title, 62)}
          </div>
          <div style={{ display: "flex", marginTop: 22, alignItems: "center" }}>
            <div style={{ display: "flex", width: 44, height: 4, background: ORANGE, borderRadius: 2 }} />
            <div style={{ display: "flex", width: 24, height: 4, background: BLUE, borderRadius: 2, marginLeft: 6 }} />
            <span style={{ color: "#64748b", fontSize: 15, marginLeft: 16 }}>training.allstartalent.us</span>
          </div>
        </div>
        {/* Right thumbnail */}
        {img && (
          <div style={{ display: "flex", width: 450, height: 295, overflow: "hidden", borderRadius: 16, border: "5px solid #fff" }}>
            <img src={img} width={450} height={295}
              style={{ width: 450, height: 295, objectFit: "cover" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Template 8: Bold Type ───────────────────────────────────────────────────
   Typography-forward design. Massive title dominates the frame. Thumbnail
   lives in the bottom-right corner. A huge watermark star sits behind
   the text. Dramatic and punchy for Instagram.                            */
function tpl8(img: string | null, title: string, sub: string) {
  const fs = title.length > 50 ? 62 : title.length > 30 ? 72 : 82;
  return (
    <div style={{ display: "flex", width: 1200, height: 630, background: "#09090b", overflow: "hidden", position: "relative" }}>
      {/* Watermark star */}
      <div style={{ position: "absolute", top: -160, left: -80, color: ORANGE, fontSize: 680, opacity: 0.04, display: "flex", lineHeight: 1 }}>★</div>
      {/* Orange top-left accent */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 630, background: ORANGE, display: "flex" }} />
      {/* Blue bottom accent */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: BLUE, display: "flex" }} />
      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 56px 44px 72px", justifyContent: "space-between", position: "relative" }}>
        {/* Brand top */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: ORANGE, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em" }}>★ ALL-STAR TRAINING</span>
          <div style={{ flex: 1, display: "flex" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>{sub}</span>
        </div>
        {/* Giant title */}
        <div style={{ display: "flex", color: "#fff", fontSize: fs, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: img ? 700 : 1080 }}>
          {clip(title, img ? 50 : 65)}
        </div>
        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 48, height: 4, background: ORANGE, borderRadius: 2 }} />
          <div style={{ display: "flex", width: 28, height: 4, background: BLUE, borderRadius: 2, marginLeft: 8 }} />
        </div>
      </div>
      {/* Thumbnail bottom-right */}
      {img && (
        <div style={{ position: "absolute", right: 44, bottom: 44, width: 360, height: 202, overflow: "hidden", borderRadius: 12, border: `2px solid rgba(240,123,0,0.4)`, display: "flex" }}>
          <img src={img} width={360} height={202}
            style={{ width: 360, height: 202, objectFit: "cover", opacity: 0.9 }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, transparent 50%, rgba(9,9,11,0.5) 100%)", display: "flex" }} />
        </div>
      )}
    </div>
  );
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawThumbUrl = sp.get("thumbnailUrl") ?? "";
  const title = sp.get("title") ?? "Untitled";
  const productName = sp.get("productName") ?? "All-Star Training";
  const template = parseInt(sp.get("template") ?? "1");

  let thumbData: string | null = null;
  if (rawThumbUrl) {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const headers: Record<string, string> =
        rawThumbUrl.includes(".blob.vercel-storage.com") && token
          ? { Authorization: `Bearer ${token}` }
          : {};
      const r = await fetch(rawThumbUrl, { headers });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const mime = r.headers.get("content-type") ?? "image/jpeg";
        thumbData = `data:${mime};base64,${b64}`;
      }
    } catch { /* no thumbnail — templates degrade gracefully */ }
  }

  const tpls = [tpl1, tpl2, tpl3, tpl4, tpl5, tpl6, tpl7, tpl8];
  const fn = tpls[(template - 1) % 8] ?? tpl1;
  const element = fn(thumbData, title, productName);

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

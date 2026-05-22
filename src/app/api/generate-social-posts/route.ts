import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const { title, description, productName, category, contentUrl, type } = await req.json();

  const cleanDesc = description ? description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) : "";

  const context = [
    `Company: All-Star Talent (staffing & recruiting industry)`,
    `Product/Topic: ${productName}`,
    category ? `Category: ${category}` : null,
    `Title: "${title}"`,
    `Content type: Training ${type === "article" ? "article/guide" : "video"}`,
    cleanDesc ? `Summary: ${cleanDesc}` : null,
    `URL: ${contentUrl}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are a social media content writer for All-Star Talent, a staffing and recruiting company. Generate three platform-specific posts for a piece of training content that will be shared publicly to attract recruiters, hiring managers, and industry professionals.

${context}

Create one post for each platform:

LINKEDIN: Professional and educational tone. 150–250 words. Open with a compelling hook or insight, share 1-2 key takeaways from the content, then a call to action with the URL. End with 4–6 relevant hashtags like #Recruiting #Staffing #HiringTips. No emojis.

INSTAGRAM: Energetic and visual-friendly. 40–70 words of punchy copy, then a blank line, then 12–15 hashtags all on one line. Use 1-2 emojis max. The copy should feel inspirational and short.

FACEBOOK: Conversational and engaging. 80–120 words. Start with a question or bold statement to spark engagement. Include the URL naturally in the text. End with 2–3 hashtags. Friendly tone, can use 1-2 emojis.

All posts must include the URL: ${contentUrl}

Respond ONLY with valid JSON, no markdown, no explanation:
{"linkedin":"...","instagram":"...","facebook":"..."}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim();

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const posts = JSON.parse(cleaned);
    if (!posts.linkedin || !posts.instagram || !posts.facebook) {
      throw new Error("Missing platform keys");
    }
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}

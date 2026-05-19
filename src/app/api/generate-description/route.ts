import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const { title, category, product, transcript } = await req.json();

  const contextBlock = [
    `Product: ${product}`,
    category ? `Category: ${category}` : null,
    `Topic: ${title}`,
  ].filter(Boolean).join("\n");

  const prompt = transcript?.trim()
    ? `Write a 1–2 sentence description for a training video (under 80 words). Be specific about what the viewer will learn. Plain text only, no markdown, no bullet points.\n\n${contextBlock}\n\nThe narrator said:\n"${transcript.trim()}"`
    : `Write a 1–2 sentence description for a training video (under 80 words). Be specific about what the viewer will learn. Plain text only, no markdown, no bullet points.\n\n${contextBlock}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const description = (data.content?.[0]?.text ?? "").trim();
  return NextResponse.json({ description });
}

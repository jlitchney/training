import { NextRequest, NextResponse } from "next/server";
import { getSubscribers, saveSubscribers, newSubscriber } from "@/lib/newsletter";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validateApiKey(req: NextRequest): boolean {
  const secret = process.env.NEWSLETTER_WEBHOOK_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === secret;
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader === secret;
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) return unauthorized();

  let body: { firstName?: string; lastName?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { firstName, lastName, email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || undefined;

  const subscribers = await getSubscribers();
  const existing = subscribers.find((s) => s.email === email.toLowerCase().trim());

  if (existing?.active) {
    return NextResponse.json({ ok: true, subscriber_id: existing.id, status: "already_subscribed" });
  }

  if (existing) {
    existing.active = true;
    existing.source = "crm";
    if (name) existing.name = name;
    await saveSubscribers(subscribers);
    return NextResponse.json({ ok: true, subscriber_id: existing.id, status: "reactivated" });
  }

  const sub = newSubscriber(email, name, "crm");
  await saveSubscribers([...subscribers, sub]);
  return NextResponse.json({ ok: true, subscriber_id: sub.id, status: "subscribed" }, { status: 201 });
}

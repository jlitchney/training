import { NextRequest, NextResponse } from "next/server";
import { getSubscribers, saveSubscribers, newSubscriber } from "@/lib/newsletter";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json() as { email: string; name?: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const subscribers = await getSubscribers();
  const existing = subscribers.find((s) => s.email === email.toLowerCase().trim());
  if (existing?.active) return NextResponse.json({ ok: true });

  if (existing) {
    existing.active = true;
    await saveSubscribers(subscribers);
    return NextResponse.json({ ok: true });
  }

  const sub = newSubscriber(email, name, "signup");
  await saveSubscribers([...subscribers, sub]);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSubscribers, saveSubscribers, newSubscriber } from "@/lib/newsletter";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscribers = await getSubscribers();
  return NextResponse.json(subscribers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const subscribers = await getSubscribers();

  if (body.type === "add") {
    const { email, name } = body as { email: string; name?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const exists = subscribers.find((s) => s.email === email.toLowerCase().trim());
    if (exists) {
      if (!exists.active) {
        exists.active = true;
        await saveSubscribers(subscribers);
      }
      return NextResponse.json(exists);
    }
    const sub = newSubscriber(email, name, "upload");
    await saveSubscribers([...subscribers, sub]);
    return NextResponse.json(sub);
  }

  if (body.type === "bulk") {
    const { subscribers: incoming } = body as { subscribers: { email: string; name?: string }[] };
    const emailSet = new Set(subscribers.map((s) => s.email));
    const added: typeof subscribers = [];
    for (const row of incoming) {
      const email = row.email?.toLowerCase().trim();
      if (!email || emailSet.has(email)) continue;
      const sub = newSubscriber(email, row.name, "upload");
      added.push(sub);
      emailSet.add(email);
    }
    await saveSubscribers([...subscribers, ...added]);
    return NextResponse.json({ added: added.length });
  }

  if (body.type === "remove") {
    const { email } = body as { email: string };
    const updated = subscribers.map((s) =>
      s.email === email.toLowerCase().trim() ? { ...s, active: false } : s
    );
    await saveSubscribers(updated);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

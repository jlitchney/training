import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";
import {
  getSubscribers,
  getCampaigns,
  saveCampaigns,
  buildNewsletterEmail,
  NewsletterItem,
  SentCampaign,
} from "@/lib/newsletter";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaigns = await getCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  const { subject, intro, items } = await req.json() as {
    subject: string;
    intro?: string;
    items: NewsletterItem[];
  };

  if (!subject || !items?.length) {
    return NextResponse.json({ error: "subject and items are required" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://training.allstartalent.us";
  const fromEmail = process.env.SHARE_FROM_EMAIL ?? "noreply@send.training.allstartalent.us";
  const from = `All-Star Training <${fromEmail}>`;

  const allSubscribers = await getSubscribers();
  const active = allSubscribers.filter((s) => s.active);

  const resend = new Resend(apiKey);

  const emails = active.map((s) => ({
    from,
    to: s.email,
    subject,
    html: buildNewsletterEmail({ subject, intro, items, recipientEmail: s.email, origin }),
  }));

  const CHUNK = 100;
  let sent = 0;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    await resend.batch.send(chunk);
    sent += chunk.length;
  }

  const campaign: SentCampaign = {
    id: uuidv4(),
    subject,
    intro,
    sentAt: new Date().toISOString(),
    sentBy: session.email,
    recipientCount: sent,
    items,
  };

  const campaigns = await getCampaigns();
  await saveCampaigns([campaign, ...campaigns]);

  return NextResponse.json({ ok: true, sent });
}

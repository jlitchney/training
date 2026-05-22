import { NextRequest, NextResponse } from "next/server";
import { getSubscribers, saveSubscribers } from "@/lib/newsletter";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") ?? "";
  if (email) {
    const subscribers = await getSubscribers();
    const updated = subscribers.map((s) =>
      s.email === email.toLowerCase().trim() ? { ...s, active: false } : s
    );
    await saveSubscribers(updated);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed</title>
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .wrap { max-width: 480px; margin: 80px auto; padding: 0 24px; text-align: center; }
    .card { background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 48px 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 10px 0; }
    p { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>You've been unsubscribed.</h1>
      <p>You won't receive any more newsletters from All-Star Training.</p>
      <p style="margin-top:16px;"><a href="/">Return to the knowledge base</a></p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFolders, createFolder } from "@/lib/kv";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getFolders());
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const folder = await createFolder(name);
  return NextResponse.json(folder, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllUsers, createUser } from "@/lib/users";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await getAllUsers();
  const safe = Object.values(users).map(({ passwordHash: _, ...u }) => u);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { email, name, password, role } = body;
  if (!email || !name || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await createUser({
    email: email.toLowerCase(),
    name,
    passwordHash,
    role: role ?? "staff",
    active: true,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

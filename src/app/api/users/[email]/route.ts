import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/users";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name) patch.name = body.name;
  if (body.role) patch.role = body.role;
  if (body.active !== undefined) patch.active = body.active;
  if (body.password) patch.passwordHash = await bcrypt.hash(body.password, 10);

  const updated = await updateUser(decodeURIComponent(email), patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email } = await params;
  await deleteUser(decodeURIComponent(email));
  return NextResponse.json({ ok: true });
}

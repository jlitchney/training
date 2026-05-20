import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAssignments, saveAssignments, getTrainingPlans } from "@/lib/kv";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = await getAssignments();
  if (session.role === "admin" || session.role === "manager") {
    return NextResponse.json(all);
  }
  return NextResponse.json(all.filter((a) => a.userId === session.email));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.type === "delete") {
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const assignments = await getAssignments();
    await saveAssignments(assignments.filter((a) => a.id !== body.assignmentId));
    return NextResponse.json({ ok: true });
  }

  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { planId, userId, userName, dueDate } = body;
  if (!planId || !userId || !userName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const plans = await getTrainingPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const assignment = {
    id: uuidv4(),
    planId,
    planTitle: plan.title,
    userId,
    userName,
    assignedBy: session.email,
    assignedAt: new Date().toISOString(),
    ...(dueDate ? { dueDate } : {}),
  };

  const assignments = await getAssignments();
  await saveAssignments([...assignments, assignment]);
  return NextResponse.json(assignment, { status: 201 });
}

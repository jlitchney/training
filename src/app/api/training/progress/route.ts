import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAssignments, getPlanProgress, savePlanProgress, getTrainingPlans } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });

  const assignments = await getAssignments();
  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdminOrManager = session.role === "admin" || session.role === "manager";
  if (!isAdminOrManager && assignment.userId !== session.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = await getPlanProgress(assignmentId);
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { assignmentId, planId, itemId, completed, response } = body;
  if (!assignmentId || !planId || !itemId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const assignments = await getAssignments();
  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignment.userId !== session.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plans = await getTrainingPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const progress = await getPlanProgress(assignmentId);
  progress[itemId] = {
    completed: !!completed,
    ...(completed ? { completedAt: new Date().toISOString() } : {}),
    ...(response !== undefined ? { response } : {}),
  };
  await savePlanProgress(assignmentId, progress);
  return NextResponse.json(progress[itemId]);
}

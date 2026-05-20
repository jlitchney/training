import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTrainingPlans, createTrainingPlan } from "@/lib/kv";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plans = await getTrainingPlans();
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { title, description, items } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const plan = await createTrainingPlan({
    title,
    description: description ?? "",
    createdBy: session.email,
    items: items ?? [],
  });
  return NextResponse.json(plan, { status: 201 });
}

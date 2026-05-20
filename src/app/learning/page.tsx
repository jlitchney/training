"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

interface User {
  email: string;
  name: string;
  role: string;
}

interface TrainingPlan {
  id: string;
  title: string;
  description?: string;
  items: { id: string }[];
}

interface PlanAssignment {
  id: string;
  planId: string;
  planTitle: string;
  userId: string;
  userName: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
}

interface ItemProgress {
  completed: boolean;
  completedAt?: string;
}

interface AppUser {
  email: string;
  name: string;
  role: string;
  active: boolean;
}

type Tab = "my-training" | "plan-library" | "assignments";

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">{value}/{total}</span>
    </div>
  );
}

export default function LearningPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("my-training");

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Record<string, ItemProgress>>>({});
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignUserName, setAssignUserName] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assigning, setAssigning] = useState(false);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const loadProgress = useCallback(async (assignmentList: PlanAssignment[]) => {
    const map: Record<string, Record<string, ItemProgress>> = {};
    await Promise.all(
      assignmentList.map(async (a) => {
        try {
          const r = await fetch(`/api/training/progress?assignmentId=${a.id}`);
          if (r.ok) map[a.id] = await r.json();
        } catch { /* best effort */ }
      })
    );
    setProgressMap(map);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then(async (u: User | null) => {
        if (!u) return;
        setUser(u);
        const isAM = u.role === "admin" || u.role === "manager";
        const fetches: Promise<unknown>[] = [
          fetch("/api/training/plans").then((r) => r.json()),
          fetch("/api/training/assignments").then((r) => r.json()),
        ];
        if (isAM) fetches.push(fetch("/api/users").then((r) => r.json()));
        const results = await Promise.all(fetches);
        const fetchedPlans = results[0] as TrainingPlan[];
        const fetchedAssignments = results[1] as PlanAssignment[];
        setPlans(fetchedPlans);
        setAssignments(fetchedAssignments);
        if (isAM && results[2]) setAllUsers(results[2] as AppUser[]);
        await loadProgress(fetchedAssignments);
        setLoading(false);
      });
  }, [router, loadProgress]);

  async function handleCreatePlan() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/training/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      if (r.ok) {
        const plan: TrainingPlan = await r.json();
        setPlans((prev) => [...prev, plan]);
        setShowNewPlan(false);
        setNewTitle("");
        setNewDesc("");
        router.push(`/learning/plans/${plan.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm("Delete this plan? All assignments will also be removed.")) return;
    await fetch(`/api/training/plans/${planId}`, { method: "DELETE" });
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    setAssignments((prev) => prev.filter((a) => a.planId !== planId));
  }

  async function handleAssign() {
    if (!assignPlanId || !assignUserId) return;
    setAssigning(true);
    try {
      const r = await fetch("/api/training/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: assignPlanId,
          userId: assignUserId,
          userName: assignUserName,
          ...(assignDue ? { dueDate: assignDue } : {}),
        }),
      });
      if (r.ok) {
        const newAssignment: PlanAssignment = await r.json();
        setAssignments((prev) => [...prev, newAssignment]);
        setProgressMap((prev) => ({ ...prev, [newAssignment.id]: {} }));
        setShowAssignModal(false);
        setAssignPlanId("");
        setAssignUserId("");
        setAssignUserName("");
        setAssignDue("");
      }
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm("Remove this assignment?")) return;
    await fetch("/api/training/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete", assignmentId }),
    });
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }

  const myAssignments = assignments.filter((a) => a.userId === user?.email);

  function completedCount(assignmentId: string, planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return { done: 0, total: 0 };
    const prog = progressMap[assignmentId] ?? {};
    const done = plan.items.filter((i) => prog[i.id]?.completed).length;
    return { done, total: plan.items.length };
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo-black.svg" alt="All-Star Training" className="h-8 w-auto" />
            </Link>
            <span className="text-sm text-gray-400 hidden sm:block">Learning Center</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Link href="/" className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors">
                Knowledge Base
              </Link>
              <Link href="/studio" className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors">
                Recording Studio
              </Link>
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm">
                Learning Center
              </span>
            </div>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("my-training")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "my-training" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              My Training
            </button>
            {isAdminOrManager && (
              <>
                <button
                  onClick={() => setTab("plan-library")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "plan-library" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  Plan Library
                </button>
                <button
                  onClick={() => setTab("assignments")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "assignments" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  Assignments
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "my-training" && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-6">My Training</h1>
            {myAssignments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p>No training plans assigned yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myAssignments.map((a) => {
                  const plan = plans.find((p) => p.id === a.planId);
                  if (!plan) return null;
                  const { done, total } = completedCount(a.id, a.planId);
                  return (
                    <Link
                      key={a.id}
                      href={`/learning/plans/${a.planId}?assignment=${a.id}`}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{plan.title}</h3>
                      {plan.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{plan.description}</p>}
                      <div className="mb-3">
                        <ProgressBar value={done} total={total} />
                      </div>
                      {a.dueDate && (
                        <p className="text-xs text-gray-400 mb-2">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                      )}
                      <span className="text-xs font-medium text-blue-600">Continue →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "plan-library" && isAdminOrManager && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">Plan Library</h1>
              <button
                onClick={() => setShowNewPlan(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                + New Plan
              </button>
            </div>

            {showNewPlan && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                <h3 className="font-semibold text-gray-900 mb-3">New Training Plan</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Plan title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCreatePlan}
                    disabled={creating || !newTitle.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                  >
                    {creating ? "Creating…" : "Save & Edit"}
                  </button>
                  <button
                    onClick={() => { setShowNewPlan(false); setNewTitle(""); setNewDesc(""); }}
                    className="border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {plans.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>No plans yet. Create your first training plan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => {
                  const assignCount = assignments.filter((a) => a.planId === plan.id).length;
                  return (
                    <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                        {plan.description && <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {plan.items.length} item{plan.items.length !== 1 ? "s" : ""} · {assignCount} assignment{assignCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/learning/plans/${plan.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && isAdminOrManager && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
              <button
                onClick={() => setShowAssignModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                + Assign Plan
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>No assignments yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Progress</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((a) => {
                      const { done, total } = completedCount(a.id, a.planId);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{a.userName}</td>
                          <td className="px-4 py-3 text-gray-600">{a.planTitle}</td>
                          <td className="px-4 py-3 text-gray-400">{new Date(a.assignedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-500">{done}/{total} complete</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Assign Training Plan</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
                <select
                  value={assignUserId}
                  onChange={(e) => {
                    const u = allUsers.find((u) => u.email === e.target.value);
                    setAssignUserId(e.target.value);
                    setAssignUserName(u?.name ?? "");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select user…</option>
                  {allUsers.filter((u) => u.active).map((u) => (
                    <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due date (optional)</label>
                <input
                  type="date"
                  value={assignDue}
                  onChange={(e) => setAssignDue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAssign}
                disabled={assigning || !assignPlanId || !assignUserId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                {assigning ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={() => { setShowAssignModal(false); setAssignPlanId(""); setAssignUserId(""); setAssignUserName(""); setAssignDue(""); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface User {
  email: string;
  name: string;
  role: string;
}

interface TrainingPlanItem {
  id: string;
  type: "video" | "article" | "task";
  productId?: string;
  contentId?: string;
  title: string;
  description?: string;
  prompt?: string;
  order: number;
}

interface TrainingPlan {
  id: string;
  title: string;
  description?: string;
  items: TrainingPlanItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemProgress {
  completed: boolean;
  completedAt?: string;
  response?: string;
}

interface ChecklistItem {
  id: string;
  productId: string;
  title: string;
  description?: string;
  category?: string;
  videoId?: string;
  type?: "video" | "article";
  articleContent?: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

function typeBadge(type: "video" | "article" | "task") {
  if (type === "video") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Video</span>;
  if (type === "article") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Article</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Task</span>;
}

function SortableItem({
  item,
  onRemove,
}: {
  item: TrainingPlanItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg border border-gray-200 p-3 flex items-start gap-3">
      <button {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm-6 6a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {typeBadge(item.type)}
          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
        </div>
        {item.prompt && <div className="text-xs text-gray-500 mt-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: item.prompt }} />}
      </div>
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ContentPickerModal({
  onAdd,
  onClose,
}: {
  onAdd: (item: TrainingPlanItem) => void;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  async function selectProduct(product: Product) {
    setSelectedProduct(product);
    setLoadingItems(true);
    try {
      const r = await fetch(`/api/checklist?productId=${product.id}`);
      const items: ChecklistItem[] = await r.json();
      setChecklistItems(items.filter((i) => (i.type === "article" && i.articleContent) || (i.videoId)));
    } finally {
      setLoadingItems(false);
    }
  }

  function addItem(ci: ChecklistItem) {
    if (!selectedProduct) return;
    const itemType = ci.type === "article" ? "article" : "video";
    onAdd({
      id: crypto.randomUUID(),
      type: itemType,
      productId: selectedProduct.id,
      contentId: ci.id,
      title: ci.title,
      description: ci.description,
      order: 0,
    });
    onClose();
  }

  const grouped = checklistItems.reduce<Record<string, ChecklistItem[]>>((acc, ci) => {
    const cat = ci.category ?? "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ci);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Add Content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!selectedProduct ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">Select a product to browse its content:</p>
              <div className="space-y-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-900 flex items-center gap-2"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : loadingItems ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : checklistItems.length === 0 ? (
            <div>
              <button onClick={() => setSelectedProduct(null)} className="text-sm text-blue-600 mb-4 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <p className="text-sm text-gray-400 text-center py-8">No video or article content found.</p>
            </div>
          ) : (
            <div>
              <button onClick={() => setSelectedProduct(null)} className="text-sm text-blue-600 mb-4 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <p className="text-sm font-medium text-gray-700 mb-3">{selectedProduct.emoji} {selectedProduct.name}</p>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
                  <div className="space-y-1">
                    {items.map((ci) => (
                      <button
                        key={ci.id}
                        onClick={() => addItem(ci)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {ci.type === "article"
                            ? <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">Article</span>
                            : <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Video</span>
                          }
                          <span className="text-sm text-gray-900">{ci.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignment");

  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [progress, setProgress] = useState<Record<string, ItemProgress>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");

  const [showContentPicker, setShowContentPicker] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [taskResponses, setTaskResponses] = useState<Record<string, string>>({});

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planIdRef = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isBuilderMode = !assignmentId && isAdminOrManager;

  const debouncedSave = useCallback((updatedPlan: TrainingPlan) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await fetch(`/api/training/plans/${updatedPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedPlan.title,
          description: updatedPlan.description,
          items: updatedPlan.items,
        }),
      });
    }, 800);
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const planId = pathParts[pathParts.length - 1];
    planIdRef.current = planId;

    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then(async (u: User | null) => {
        if (!u) return;
        setUser(u);

        const planRes = await fetch(`/api/training/plans/${planId}`);
        if (!planRes.ok) { setNotFound(true); setLoading(false); return; }
        const fetchedPlan: TrainingPlan = await planRes.json();
        setPlan(fetchedPlan);
        setTitleDraft(fetchedPlan.title);
        setDescDraft(fetchedPlan.description ?? "");

        if (assignmentId) {
          const progRes = await fetch(`/api/training/progress?assignmentId=${assignmentId}`);
          if (progRes.ok) {
            const prog: Record<string, ItemProgress> = await progRes.json();
            setProgress(prog);
            const responses: Record<string, string> = {};
            for (const [itemId, p] of Object.entries(prog)) {
              if (p.response) responses[itemId] = p.response;
            }
            setTaskResponses(responses);
          }
        }
        setLoading(false);
      });
  }, [router, assignmentId]);

  function updatePlan(updater: (prev: TrainingPlan) => TrainingPlan) {
    setPlan((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      debouncedSave(updated);
      return updated;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !plan) return;
    const oldIdx = plan.items.findIndex((i) => i.id === active.id);
    const newIdx = plan.items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(plan.items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx + 1 }));
    updatePlan((p) => ({ ...p, items: reordered }));
  }

  function handleRemoveItem(itemId: string) {
    updatePlan((p) => ({ ...p, items: p.items.filter((i) => i.id !== itemId) }));
  }

  function handleAddContent(item: TrainingPlanItem) {
    updatePlan((p) => ({ ...p, items: [...p.items, { ...item, order: p.items.length + 1 }] }));
  }

  function handleAddTask() {
    if (!taskTitle.trim()) return;
    const newItem: TrainingPlanItem = {
      id: crypto.randomUUID(),
      type: "task",
      title: taskTitle.trim(),
      prompt: taskPrompt.trim() || undefined,
      order: (plan?.items.length ?? 0) + 1,
    };
    updatePlan((p) => ({ ...p, items: [...p.items, newItem] }));
    setTaskTitle("");
    setTaskPrompt("");
    setShowAddTask(false);
  }

  function saveTitleEdit() {
    if (!titleDraft.trim()) return;
    updatePlan((p) => ({ ...p, title: titleDraft.trim() }));
    setEditTitle(false);
  }

  function saveDescEdit() {
    updatePlan((p) => ({ ...p, description: descDraft }));
    setEditDesc(false);
  }

  async function toggleItemComplete(item: TrainingPlanItem) {
    if (!assignmentId || !plan) return;
    const current = progress[item.id]?.completed ?? false;
    const newCompleted = !current;
    const r = await fetch("/api/training/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        planId: plan.id,
        itemId: item.id,
        completed: newCompleted,
        response: progress[item.id]?.response,
      }),
    });
    if (r.ok) {
      const updated: ItemProgress = await r.json();
      setProgress((prev) => ({ ...prev, [item.id]: updated }));
    }
  }

  async function submitTaskResponse(item: TrainingPlanItem) {
    if (!assignmentId || !plan) return;
    const response = taskResponses[item.id] ?? "";
    const r = await fetch("/api/training/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        planId: plan.id,
        itemId: item.id,
        completed: true,
        response,
      }),
    });
    if (r.ok) {
      const updated: ItemProgress = await r.json();
      setProgress((prev) => ({ ...prev, [item.id]: updated }));
    }
  }

  function toggleExpanded(itemId: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-400">Plan not found.</div>;
  if (!plan) return null;

  const completedCount = plan.items.filter((i) => progress[i.id]?.completed).length;
  const totalCount = plan.items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/learning" className="text-gray-500 hover:text-gray-900 transition-colors">
              {assignmentId ? "← My Training" : "← Learning Center"}
            </Link>
          </div>
          {user && <UserMenu user={user} />}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          {isBuilderMode ? (
            <div>
              {editTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitleEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitleEdit(); if (e.key === "Escape") { setEditTitle(false); setTitleDraft(plan.title); } }}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
                    autoFocus
                  />
                </div>
              ) : (
                <button onClick={() => setEditTitle(true)} className="group flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{plan.title}</h1>
                  <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {editDesc ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={saveDescEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") saveDescEdit(); if (e.key === "Escape") { setEditDesc(false); setDescDraft(plan.description ?? ""); } }}
                    className="text-gray-500 border-b border-blue-500 outline-none bg-transparent w-full text-sm"
                    placeholder="Add a description…"
                    autoFocus
                  />
                </div>
              ) : (
                <button onClick={() => setEditDesc(true)} className="group flex items-center gap-2">
                  <p className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                    {plan.description || <span className="italic text-gray-300">Add a description…</span>}
                  </p>
                  <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{plan.title}</h1>
              {plan.description && <p className="text-sm text-gray-500 mb-3">{plan.description}</p>}
              {assignmentId && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: totalCount === 0 ? "0%" : `${Math.round((completedCount / totalCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 flex-shrink-0">{completedCount}/{totalCount} complete</span>
                </div>
              )}
            </div>
          )}
        </div>

        {isBuilderMode ? (
          <div>
            {plan.items.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mb-4">
                <p className="text-sm">No items yet. Add content or tasks below.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={plan.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 mb-4">
                    {plan.items.map((item) => (
                      <SortableItem key={item.id} item={item} onRemove={handleRemoveItem} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {showAddTask && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <h3 className="font-medium text-gray-900 mb-3 text-sm">New Task</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <RichTextEditor
                    value={taskPrompt}
                    onChange={setTaskPrompt}
                    placeholder="Instructions for the learner (optional)"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddTask}
                    disabled={!taskTitle.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Add Task
                  </button>
                  <button
                    onClick={() => { setShowAddTask(false); setTaskTitle(""); setTaskPrompt(""); }}
                    className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowContentPicker(true)}
                className="border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                + Add Content
              </button>
              <button
                onClick={() => setShowAddTask(true)}
                className="border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                + Add Task
              </button>
            </div>

            {showContentPicker && (
              <ContentPickerModal onAdd={handleAddContent} onClose={() => setShowContentPicker(false)} />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {plan.items.map((item) => {
              const done = progress[item.id]?.completed ?? false;
              const isExpanded = expandedItems.has(item.id);

              return (
                <div key={item.id} className={`bg-white rounded-xl border transition-colors ${done ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {assignmentId && (
                        <button
                          onClick={() => item.type !== "task" && toggleItemComplete(item)}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"} ${item.type === "task" ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {done && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {typeBadge(item.type)}
                          {item.type === "article" ? (
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {item.title}
                              <svg className={`inline w-3.5 h-3.5 ml-1.5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{item.title}</span>
                          )}
                        </div>

                        {item.type === "video" && item.productId && item.contentId && (
                          <Link
                            href={`/${item.productId}/${item.contentId}`}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Watch Video →
                          </Link>
                        )}

                        {item.type === "article" && isExpanded && (
                          <div className="mt-3 prose prose-sm max-w-none text-gray-700 border-t border-gray-100 pt-3">
                            {/* article content is fetched from checklist when building;
                                for player mode we show a stub — full content shown in product page */}
                            <p className="text-sm text-gray-500 italic">
                              Article content is available in the{" "}
                              {item.productId ? (
                                <Link href={`/${item.productId}`} className="text-blue-600 hover:underline">product knowledge base</Link>
                              ) : "knowledge base"}.
                            </p>
                          </div>
                        )}

                        {item.type === "task" && (
                          <div className="mt-2">
                            {item.prompt && <div className="text-sm text-gray-600 mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: item.prompt }} />}
                            {assignmentId && !done && (
                              <div className="space-y-2">
                                <textarea
                                  value={taskResponses[item.id] ?? ""}
                                  onChange={(e) => setTaskResponses((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  placeholder="Your response…"
                                  rows={3}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                                />
                                <button
                                  onClick={() => submitTaskResponse(item)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                                >
                                  Mark Complete
                                </button>
                              </div>
                            )}
                            {done && progress[item.id]?.response && (
                              <div className="mt-2 bg-white border border-green-200 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Your response:</p>
                                <p className="text-sm text-gray-700">{progress[item.id].response}</p>
                              </div>
                            )}
                            {done && assignmentId && (
                              <button
                                onClick={() => toggleItemComplete(item)}
                                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                              >
                                Mark incomplete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {plan.items.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>This plan has no items yet.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

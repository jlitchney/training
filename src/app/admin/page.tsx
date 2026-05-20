"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u) return;
      if (u.role !== "admin") { router.push("/studio"); return; }
      setUser(u);
    });
  }, [router]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Studio</Link>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-gray-900">Admin</span>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <Link
            href="/admin/products"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm hover:border-gray-300 transition-all"
          >
            <div className="text-3xl mb-3">📦</div>
            <h2 className="font-semibold text-gray-900 mb-1">Topics</h2>
            <p className="text-sm text-gray-500">Manage topics, descriptions, and recording checklists.</p>
          </Link>
          <Link
            href="/admin/users"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm hover:border-gray-300 transition-all"
          >
            <div className="text-3xl mb-3">👥</div>
            <h2 className="font-semibold text-gray-900 mb-1">Users</h2>
            <p className="text-sm text-gray-500">Add and manage staff accounts and roles.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

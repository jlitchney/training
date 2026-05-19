"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

interface AppUser {
  email: string;
  name: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "staff">("staff");
  const [editActive, setEditActive] = useState(true);
  const [changePassword, setChangePassword] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((u) => {
      if (!u || u.role !== "admin") { router.push("/studio"); return; }
      setCurrentUser(u);
      setCurrentEmail(u.email);
      return fetch("/api/users").then((r) => r.json());
    }).then((data?: AppUser[]) => {
      if (!data) return;
      setUsers(data);
      setLoading(false);
    });
  }, [router]);

  async function handleAdd() {
    setAddError("");
    if (!newEmail || !newName || !newPassword) { setAddError("All fields required"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole }),
      });
      if (!res.ok) { const d = await res.json(); setAddError(d.error ?? "Failed"); return; }
      const refetch = await fetch("/api/users").then((r) => r.json());
      setUsers(refetch);
      setShowAdd(false);
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("staff");
    } finally {
      setAdding(false);
    }
  }

  async function handleEditSave() {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = { name: editName, role: editRole, active: editActive };
      if (changePassword && editPassword) body.password = editPassword;
      const res = await fetch(`/api/users/${encodeURIComponent(editUser.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated: AppUser = await res.json();
        setUsers((prev) => prev.map((u) => (u.email === updated.email ? updated : u)));
        setEditUser(null);
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(user: AppUser) {
    if (user.email === currentEmail) { alert("Cannot delete your own account."); return; }
    if (!confirm(`Delete ${user.name}?`)) return;
    await fetch(`/api/users/${encodeURIComponent(user.email)}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.email !== user.email));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">Users</span>
          </div>
          {currentUser && <UserMenu user={currentUser} />}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Add User
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.email} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditUser(user); setEditName(user.name); setEditRole(user.role); setEditActive(user.active); setChangePassword(false); setEditPassword(""); }}
                      className="text-xs text-gray-500 hover:text-gray-900 mr-3"
                    >
                      Edit
                    </button>
                    {user.email !== currentEmail && (
                      <button onClick={() => handleDelete(user)} className="text-xs text-gray-400 hover:text-red-600">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Add Team Member</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "staff")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                {adding ? "Adding…" : "Add User"}
              </button>
              <button onClick={() => { setShowAdd(false); setAddError(""); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Edit {editUser.name}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Full name" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <select value={editRole} onChange={(e) => setEditRole(e.target.value as "admin" | "staff")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} className="rounded" />
                Reset password
              </label>
              {changePassword && (
                <input type="password" placeholder="New password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                {editSaving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

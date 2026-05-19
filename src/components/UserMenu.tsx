"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface Props {
  user: { name: string; role: string };
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors select-none"
      >
        {user.name}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

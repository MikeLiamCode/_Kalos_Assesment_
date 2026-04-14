"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton({
  callbackUrl = "/login",
}: {
  callbackUrl?: string;
}) {
  return (
    <button
      onClick={() => signOut({ callbackUrl })}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
    >
      <LogOut size={16} />
      Logout
    </button>
  );
}
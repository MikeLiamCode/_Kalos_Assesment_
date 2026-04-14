"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function CoachLoginPage() {
  const [email, setEmail] = useState("coach@kalos.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/membergpt",
    });

    if (result?.error) {
      setError("Invalid coach credentials");
      return;
    }

    window.location.href = "/membergpt";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              Coach access
            </div>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              Use MemberGPT to guide better coaching conversations.
            </h1>

            <p className="text-lg leading-8 text-slate-300">
              Ask grounded questions about member trends, scan history, lean
              mass changes, and next-session priorities through a secure,
              coach-only workspace.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-400">Secure access</p>
                <p className="mt-2 text-xl font-semibold">Coach-only login</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-400">AI assistant</p>
                <p className="mt-2 text-xl font-semibold">Grounded in scan data</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
                Kalos
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Coach Login</h2>
              <p className="mt-2 text-sm text-slate-300">
                Sign in to access MemberGPT and member performance insights.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@kalos.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200">
                Sign in as Coach
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-sm text-slate-300">Demo coach account</p>
              <p className="mt-2 text-sm font-medium text-white">
                coach@kalos.com / password123
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
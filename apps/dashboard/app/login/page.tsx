"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("sarah@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-50">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              Kalos Member Portal
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight text-slate-900">
              Track your body composition with clarity and confidence.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              View your DEXA history, compare changes over time, and understand
              your progress through a clean, personalized dashboard.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Personalized</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  Member dashboard
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Progress-first</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  Trends & history
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Simple workflow</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  Upload new scans
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                Member Login
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to access your dashboard and latest DEXA insights.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Demo member account</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                sarah@example.com / password123
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      if (!csrfRes.ok) {
        setError("Failed to initialize sign-in");
        return;
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (csrfToken === undefined || csrfToken === "") {
        setError("Missing CSRF token");
        return;
      }

      const body = new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: "/admin",
      });
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body,
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || data.url === undefined || data.url.includes("error=")) {
        setError("Invalid email or password");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Network error while signing in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-4">
      <div className="w-full max-w-4xl bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-5 bg-[#0F172A] text-slate-300 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg tracking-tight">
                  E-COM
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Fuse Admin
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Welcome to your commerce command center.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Manage products, orders, fraud checks, courier settlements, and
              real-time analytics from one unified workspace.
            </p>
          </div>
          <div className="pt-8 mt-8 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Protected by NextAuth &amp; RBAC</span>
          </div>
        </div>

        <div className="md:col-span-7 p-4">
          <div className="mb-6">
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              Administrator Access
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign In
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter your credentials to access the admin dashboard.
            </p>
          </div>

          {error !== null && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2.5"
            >
              <i className="ti ti-alert-circle text-lg shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <i className="ti ti-mail absolute left-3.5 top-2.5 text-slate-400 text-lg" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@ecom.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <i className="ti ti-lock absolute left-3.5 top-2.5 text-slate-400 text-lg" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <i
                    className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"} text-lg`}
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2"
            >
              <i className="ti ti-login text-lg" />
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

function friendlyError(error: string): string {
  if (error === "user_not_found") return "No account found with that email address.";
  if (error === "invalid_grant") return "Incorrect email or password.";
  return "Sign in failed. Please check your credentials and try again.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(friendlyError(data.error));
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setErrorMsg("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Sign In</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm" />
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm" />
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account? <Link href="/activate" className="font-medium text-indigo-600">Activate your account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

interface SessionResult {
  session: { email: string; name: string | null; expires_at: number };
}

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
  const [result, setResult] = useState<SessionResult | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setResult(null);

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

      setResult(data);
    } catch {
      setErrorMsg("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Sign In</h1>
          </div>

          {errorMsg && <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

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

      {result && (
        <div className="mt-10 w-full max-w-2xl rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-800">
          Signed in as <strong>{result.session.name ?? result.session.email}</strong>. Session expires at{" "}
          {new Date(result.session.expires_at * 1000).toLocaleString()}.
        </div>
      )}
    </main>
  );
}

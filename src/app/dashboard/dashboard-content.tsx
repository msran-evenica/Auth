"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "./logout-button";

type MeResponse = {
  user: {
    sub: string;
    email: string;
    name: string | null;
    expires_at: number;
  };
  decoded_id_token: Record<string, unknown>;
  entra_external_id_token: string | null;
  entra_external_refresh_token: string | null;
};

function formatExpiration(exp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(exp * 1000));
}

export function DashboardContent() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSession = useCallback(async (forceRefresh = false) => {
    const response = await fetch(forceRefresh ? "/api/me?refresh=true" : "/api/me", {
      cache: "no-store",
    });

    if (response.status === 401) {
      router.replace("/login");
      return null;
    }

    if (!response.ok) return null;

    return (await response.json()) as MeResponse;
  }, [router]);

  async function refreshTokenNow() {
    setRefreshing(true);

    try {
      const nextData = await loadSession(true);
      if (nextData) setData(nextData);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSession() {
      try {
        const nextData = await loadSession();
        if (!cancelled) setData(nextData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialSession();

    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-64 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-80 rounded bg-slate-200" />
          </header>
          <section className="h-80 rounded-2xl bg-white shadow-lg" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Signed in as</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              {data.user.name ?? data.user.email}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your token expires at{" "}
              <span className="font-semibold text-slate-800">
                {formatExpiration(data.user.expires_at)}
              </span>
              .
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={refreshTokenNow}
              disabled={refreshing}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh token"}
            </button>
            <LogoutButton />
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Decoded ID Token
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all p-6 text-sm leading-relaxed text-slate-700">
            {JSON.stringify(data.decoded_id_token, null, 2)}
          </pre>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-6 py-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Entra External ID Token JWT
            </span>
          </div>
          <textarea
            readOnly
            value={data.entra_external_id_token ?? ""}
            className="min-h-48 w-full resize-y border-0 bg-white p-6 font-mono text-sm leading-relaxed text-slate-700 outline-none"
          />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-6 py-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Entra External Refresh Token
            </span>
          </div>
          <textarea
            readOnly
            value={data.entra_external_refresh_token ?? ""}
            className="min-h-48 w-full resize-y border-0 bg-white p-6 font-mono text-sm leading-relaxed text-slate-700 outline-none"
          />
        </section>
      </div>
    </main>
  );
}

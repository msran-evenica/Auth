"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "./logout-button";

const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60;

type MeResponse = {
  user: {
    sub: string;
    email: string;
    name: string | null;
    expires_at: number;
  };
  decoded_id_token: Record<string, unknown>;
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

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) return;

        const nextData = (await response.json()) as MeResponse;
        if (!cancelled) setData(nextData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!data) return;

    const refreshAt = data.user.expires_at * 1000 - TOKEN_REFRESH_THRESHOLD_SECONDS * 1000;
    const delay = Math.max(refreshAt - Date.now(), 0);
    const timeoutId = window.setTimeout(async () => {
      const response = await fetch("/api/me", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) return;

      setData((await response.json()) as MeResponse);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [data, router]);

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
          <LogoutButton />
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
      </div>
    </main>
  );
}

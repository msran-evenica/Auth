import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, readSessionCookieValue } from "@/lib/auth-session";
import { LogoutButton } from "./logout-button";

function formatExpiration(exp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(exp * 1000));
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await readSessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Signed in as</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              {session.name ?? session.email}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your token expires at{" "}
              <span className="font-semibold text-slate-800">{formatExpiration(session.exp)}</span>.
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
            {JSON.stringify(session.decoded_id_token, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}

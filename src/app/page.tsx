import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./ui/logout-button";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";

async function getMe() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${protocol}://${host}/api/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function Home() {
  const hasSession = (await cookies()).has(SESSION_COOKIE_NAME);
  if (!hasSession) redirect("/login");

  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <main className="min-h-screen p-10 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Authenticated Home</h1>
          <LogoutButton />
        </div>
        <p>Signed in as {me.user.name ?? me.user.email}</p>
        <div className="rounded-lg bg-slate-900 border border-slate-700 p-4">
          <h2 className="mb-2 font-semibold">Decrypted ID Token Payload</h2>
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(me.decoded_id_token, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}

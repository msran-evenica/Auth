import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-slate-100 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
        <svg
          className="h-8 w-8 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-slate-800">Auth POC</h1>
      <p className="max-w-sm text-slate-500">
        A proof-of-concept authentication flow built with Next.js and Tailwind CSS.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/activate"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Activate Account
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}

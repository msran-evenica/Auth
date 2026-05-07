"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

// ---- types ------------------------------------------------------------------

type Step = "credentials" | "otp" | "success" | "error";

interface OtpMeta {
  continuation_token: string;
  challenge_target_label: string;
  code_length: number;
}

interface TokenResult {
  tokens: { id_token: string; access_token: string; expires_in: number };
  decoded_id_token: Record<string, unknown>;
}

// ---- helpers ----------------------------------------------------------------

function friendlyError(error: string, suberror?: string): string {
  if (suberror === "password_too_weak") return "Password is too weak. Choose a stronger password.";
  if (suberror === "password_too_short") return "Password must be at least 8 characters.";
  if (suberror === "password_too_long") return "Password must be fewer than 256 characters.";
  if (suberror === "password_banned") return "That password is not allowed. Please choose a different one.";
  if (suberror === "password_is_invalid") return "Password contains invalid characters.";
  if (suberror === "invalid_oob_value") return "Incorrect verification code. Please try again.";
  if (error === "user_already_exists") return "An account with this email already exists.";
  if (error === "redirect_required") return "This tenant requires browser-based authentication.";
  return "An unexpected error occurred. Please try again.";
}

// ---- page -------------------------------------------------------------------

export default function ActivatePage() {
  // step state
  const [step, setStep] = useState<Step>("credentials");

  // credentials form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [credLoading, setCredLoading] = useState(false);

  // otp form
  const [otp, setOtp] = useState("");
  const [otpMeta, setOtpMeta] = useState<OtpMeta | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // shared error
  const [errorMsg, setErrorMsg] = useState("");

  // success
  const [result, setResult] = useState<TokenResult | null>(null);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Step 1 – submit credentials
  async function handleCredentials(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }

    setCredLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(friendlyError(data.error, data.suberror));
        setStep("error");
        return;
      }

      setOtpMeta({
        continuation_token: data.continuation_token,
        challenge_target_label: data.challenge_target_label ?? email,
        code_length: data.code_length ?? 8,
      });
      setStep("otp");
    } catch {
      setErrorMsg("Could not connect to the server. Please try again.");
      setStep("error");
    } finally {
      setCredLoading(false);
    }
  }

  // Step 2 – submit OTP
  async function handleOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!otpMeta) return;

    setOtpLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/activate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, continuation_token: otpMeta.continuation_token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(friendlyError(data.error, data.suberror));
        return;
      }

      setResult(data);
      setStep("success");
    } catch {
      setErrorMsg("Could not connect to the server. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  // ---- render success -------------------------------------------------------
  if (step === "success" && result) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          {/* success header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Account Activated!</h1>
            <p className="mt-1 text-slate-500">You are now signed in. Your decoded ID token is shown below.</p>
          </div>

          {/* decoded token viewer */}
          <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-800 px-6 py-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Decoded ID Token</span>
            </div>
            <pre className="overflow-x-auto p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-all">
              {JSON.stringify(result.decoded_id_token, null, 2)}
            </pre>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- shared card wrapper --------------------------------------------------
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-10">

          {/* header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              {step === "otp" ? (
                <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2H9m6 0V7m0 4v4m0 0H9m6 0a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h2" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {step === "otp" ? "Check Your Email" : "Activate Your Account"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === "otp"
                ? `We sent a ${otpMeta?.code_length}-digit code to ${otpMeta?.challenge_target_label}.`
                : "Set your email and password to get started."}
            </p>
          </div>

          {/* step indicator */}
          <div className="mb-6 flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full transition-colors ${step !== "credentials" ? "bg-indigo-500" : "bg-indigo-500"}`} />
            <div className={`h-2 flex-1 rounded-full transition-colors ${step === "otp" || step === "success" ? "bg-indigo-500" : "bg-slate-200"}`} />
          </div>

          {/* error banner */}
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMsg}
            </div>
          )}

          {/* ---- Step 1: Credentials ---------------------------------------- */}
          {(step === "credentials" || step === "error") && (
            <form onSubmit={handleCredentials} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 ${
                    passwordMismatch
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30"
                  }`}
                />
                {passwordMismatch && (
                  <p className="mt-1.5 text-xs text-red-600">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={credLoading || passwordMismatch}
                onClick={() => { setErrorMsg(""); if (step === "error") setStep("credentials"); }}
                className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {credLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending verification code…
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          )}

          {/* ---- Step 2: OTP ----------------------------------------------- */}
          {step === "otp" && (
            <form onSubmit={handleOtp} noValidate className="space-y-5">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, otpMeta?.code_length ?? 8))}
                  placeholder={`${"·".repeat(otpMeta?.code_length ?? 8)}`}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-slate-800 placeholder-slate-300 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otp.length < (otpMeta?.code_length ?? 8)}
                className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  "Verify & Activate"
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep("credentials"); setOtp(""); setOtpMeta(null); setErrorMsg(""); }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 hover:underline"
              >
                ← Back
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Auth POC. All rights reserved.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const ERR_COPY: Record<string, string> = {
  not_configured: "Sign-in isn't set up for this app yet.",
  missing_ott: "That sign-in link looked incomplete. Try again from the email.",
  verify_failed:
    "That link has expired or already been used. Request a new one.",
};

export default function SignInPage() {
  const params = useSearchParams();
  const initialError = params.get("err");

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? (ERR_COPY[initialError] ?? "Something went wrong.") : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          body.error === "invalid_email"
            ? "That email doesn't look right."
            : "Couldn't send the link. Please try again."
        );
      }
    } catch {
      setError("Couldn't reach the sign-in service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#fdf8f0" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + heading */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: "#f5e6c8" }}
          >
            <span className="text-3xl">📒</span>
          </div>
          <h1
            className="text-3xl font-semibold text-stone-800 mb-2"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Family Notes
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your family&apos;s shared notepad.
            <br />
            No passwords needed — ever.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#fffdf7",
            border: "1px solid #e8dfc8",
            boxShadow:
              "0 2px 8px rgba(180,150,90,0.08), 0 1px 2px rgba(180,150,90,0.06)",
          }}
        >
          <h2
            className="text-xl text-stone-700 mb-1"
            style={{ fontFamily: "'Lora', serif" }}
          >
            Welcome back 👋
          </h2>
          <p className="text-stone-400 text-sm mb-6">
            We&apos;ll send a magic link to your email.
          </p>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {sent ? (
            /* Success state */
            <div
              className="rounded-xl px-4 py-4 text-sm"
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
              }}
            >
              <strong className="block font-semibold mb-1">
                Check your email ✉️
              </strong>
              We sent a magic link to{" "}
              <span className="font-medium">{email}</span>. The link expires in
              15 minutes.
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Your email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="grandma@family.com"
                className="w-full px-4 py-3 rounded-xl text-stone-700 text-sm mb-4 outline-none"
                style={{
                  border: "1px solid #d6d3d1" /* stone-300 */,
                  backgroundColor: "#fafaf9" /* stone-50 */,
                  // focus ring applied via onFocus/onBlur below for spec accuracy
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "none";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px #fcd34d" /* amber-300 */;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              <button
                type="submit"
                disabled={pending || !email}
                className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#c4882a" }}
              >
                {pending ? "Sending…" : "Send Magic Link ✨"}
              </button>

              <p className="text-center text-stone-400 text-xs mt-5">
                New to the family? Just enter your email and we&apos;ll get you
                set up.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-stone-300 text-xs mt-8">
          Made with love, for your family 🏡
        </p>
      </div>
    </main>
  );
}

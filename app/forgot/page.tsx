"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!email.trim() || pending) return;
    setPending(true);
    setError("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (res.ok) setSent(true);
    else setError(d.error ?? "Could not send the reset link.");
  }

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div
        data-reveal
        className="frame w-full max-w-sm p-8"
        style={{ background: "var(--ink-raised)", border: "1px solid var(--ink-line)" }}
      >
        <Link href="/" className="display text-3xl tracking-wide block mb-1">
          ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
        </Link>

        {sent ? (
          <>
            <h1 className="display text-2xl mt-5 mb-2" style={{ color: "var(--good)" }}>
              CHECK YOUR EMAIL
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              If an account uses that address, a reset link is on its way. It works once and
              expires in an hour. Check your spam folder if it has not arrived in a minute.
            </p>
            <Link href="/login" className="btn-ghost text-sm inline-block">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
              Enter your email and we will send you a link to set a new password.
            </p>
            <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              className="field"
              style={{ background: "var(--ink)" }}
            />
            {error && (
              <p className="text-sm mt-3" style={{ color: "var(--bad)" }}>
                {error}
              </p>
            )}
            <button onClick={submit} disabled={pending} className="btn w-full py-2.5 mt-5">
              {pending ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-sm mt-6" style={{ color: "var(--muted)" }}>
              Remembered it?{" "}
              <Link href="/login" className="underline" style={{ color: "var(--paper)" }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

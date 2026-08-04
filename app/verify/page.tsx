"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type State =
  | { name: "working" }
  | { name: "done"; email: string }
  | { name: "failed"; error: string };

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>({ name: "working" });
  const [resendEmail, setResendEmail] = useState("");
  const [resendNote, setResendNote] = useState("");
  const [resending, setResending] = useState(false);
  // React runs effects twice in development; without this the token gets
  // spent by the first pass and the second reports it invalid.
  const claimed = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ name: "failed", error: "That link is missing its token." });
      return;
    }
    if (claimed.current) return;
    claimed.current = true;

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not confirm this link.");
        setState({ name: "done", email: d.email });
      })
      .catch((e) => setState({ name: "failed", error: e.message }));
  }, [token]);

  async function resend() {
    if (!resendEmail.trim() || resending) return;
    setResending(true);
    setResendNote("");
    const res = await fetch("/api/auth/verify", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resendEmail }),
    });
    const d = await res.json().catch(() => ({}));
    setResending(false);
    setResendNote(d.message ?? d.error ?? "Could not send a new link.");
  }

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div
        data-reveal
        className="frame w-full max-w-sm p-8"
        style={{ background: "var(--ink-raised)", border: "1px solid var(--ink-line)" }}
      >
        <Link href="/" className="display text-3xl tracking-wide block mb-6">
          ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
        </Link>

        {state.name === "working" && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Confirming your email...
          </p>
        )}

        {state.name === "done" && (
          <>
            <h1 className="display text-2xl mb-2" style={{ color: "var(--good)" }}>
              EMAIL CONFIRMED
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              {state.email} is confirmed. You can sign in and start logging your sessions.
            </p>
            <Link href="/login" className="btn text-sm inline-block">
              Sign in
            </Link>
          </>
        )}

        {state.name === "failed" && (
          <>
            <h1 className="display text-2xl mb-2" style={{ color: "var(--bad)" }}>
              LINK DIDN&apos;T WORK
            </h1>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {state.error}
            </p>
            <label className="block mono text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
              Send a new link
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && resend()}
                placeholder="you@email.com"
                className="field"
                style={{ background: "var(--ink)" }}
              />
              <button onClick={resend} disabled={resending} className="btn text-sm py-2 shrink-0">
                {resending ? "..." : "Send"}
              </button>
            </div>
            {resendNote && (
              <p className="text-xs mt-3" style={{ color: "var(--good)" }}>
                {resendNote}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}

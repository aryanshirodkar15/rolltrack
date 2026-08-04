"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function Reset() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await res.json().catch(() => ({}));
    setPending(false);
    if (res.ok) setDone(true);
    else setError(d.error ?? "Could not reset the password.");
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

        {done ? (
          <>
            <h1 className="display text-2xl mt-5 mb-2" style={{ color: "var(--good)" }}>
              PASSWORD CHANGED
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Your new password is set. Sign in with it now.
            </p>
            <Link href="/login" className="btn text-sm inline-block">
              Sign in
            </Link>
          </>
        ) : !token ? (
          <>
            <h1 className="display text-2xl mt-5 mb-2" style={{ color: "var(--bad)" }}>
              LINK INCOMPLETE
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              This reset link is missing its token. Request a fresh one.
            </p>
            <Link href="/forgot" className="btn text-sm inline-block">
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
              Choose a new password for your account.
            </p>
            <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="field mb-4"
              style={{ background: "var(--ink)" }}
            />
            <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
              Confirm it
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="field"
              style={{ background: "var(--ink)" }}
            />
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              At least 8 characters.
            </p>
            {error && (
              <p className="text-sm mt-3" style={{ color: "var(--bad)" }}>
                {error}
              </p>
            )}
            <button onClick={submit} disabled={pending} className="btn w-full py-2.5 mt-5">
              {pending ? "Saving..." : "Set new password"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <Reset />
    </Suspense>
  );
}

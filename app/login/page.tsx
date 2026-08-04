"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSignIn() {
    setError("");
    setUnverified(false);
    setPending(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      if (res.code === "EmailNotVerified") {
        setUnverified(true);
        setError("Confirm your email before signing in. Check your inbox for the link.");
      } else if (res.code === "UseGoogle") {
        setError("This account signs in with Google. Use the button above.");
      } else {
        setError("That email and password don't match an account.");
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resendVerification() {
    if (resending) return;
    setResending(true);
    const res = await fetch("/api/auth/verify", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await res.json().catch(() => ({}));
    setResending(false);
    setError(d.message ?? d.error ?? "Could not send a new link.");
    setUnverified(false);
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
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Sign in to get back to your table.
        </p>

        <div className="mb-6">
          <GoogleButton label="Sign in with Google" />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              className="field"
              style={{ background: "var(--ink)" }}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              className="field"
              style={{ background: "var(--ink)" }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: unverified ? "var(--accent)" : "var(--bad)" }}>
              {error}
            </p>
          )}
          {unverified && (
            <button
              onClick={resendVerification}
              disabled={resending}
              className="chip text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {resending ? "Sending..." : "Send me a new confirmation link"}
            </button>
          )}

          <button
            onClick={handleSignIn}
            disabled={pending}
            className="btn w-full py-2.5"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>

          <Link
            href="/forgot"
            className="block text-xs text-center hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            Forgot your password?
          </Link>
        </div>

        <p className="text-sm mt-6" style={{ color: "var(--muted)" }}>
          No account yet?{" "}
          <Link href="/signup" className="underline" style={{ color: "var(--paper)" }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

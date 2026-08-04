"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [awaitingEmail, setAwaitingEmail] = useState(false);

  async function handleCreate() {
    setError("");
    setPending(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create the account.");
      setPending(false);
      return;
    }

    if (data.verificationRequired) {
      setPending(false);
      setAwaitingEmail(true);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    router.push("/dashboard");
    router.refresh();
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

        {awaitingEmail ? (
          <>
            <h1 className="display text-2xl mt-5 mb-2" style={{ color: "var(--good)" }}>
              CHECK YOUR EMAIL
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              A confirmation link is on its way to{" "}
              <span style={{ color: "var(--paper)" }}>{email}</span>. Use it to finish setting up
              your account, then sign in. Check your spam folder if it has not arrived in a
              minute.
            </p>
            <Link href="/login" className="btn-ghost text-sm inline-block">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
              Create an account and start logging your sessions.
            </p>

            <div className="mb-6">
              <GoogleButton label="Sign up with Google" />
            </div>

            <div className="space-y-4">
              {[
                { label: "Name", value: name, set: setName, type: "text" },
                { label: "Username", value: username, set: setUsername, type: "text" },
                { label: "Email", value: email, set: setEmail, type: "email" },
                { label: "Password", value: password, set: setPassword, type: "password" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs uppercase tracking-widest mb-2 mono" style={{ color: "var(--muted)" }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="field"
                    style={{ background: "var(--ink)" }}
                  />
                </div>
              ))}

              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Username is your unique handle at the table: lowercase letters, numbers, and
                underscores. Password needs at least 8 characters.
              </p>

              {error && (
                <p className="text-sm" style={{ color: "var(--bad)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={pending}
                className="btn w-full py-2.5"
              >
                {pending ? "Creating account..." : "Create account"}
              </button>
            </div>

            <p className="text-sm mt-6" style={{ color: "var(--muted)" }}>
              Already have one?{" "}
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

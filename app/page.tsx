import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Footer from "@/components/Footer";

const MARQUEE_WORDS = [
  "CAMPAIGNS",
  "ONE-SHOTS",
  "SESSIONS",
  "ARCS",
  "EVERY HOUR AT THE TABLE",
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const marqueeRun = MARQUEE_WORDS.map((w) => `${w} ✦ `).join("");

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header
        className="max-w-5xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--ink-line)" }}
      >
        <span className="display text-xl tracking-wide">
          ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
        </span>
        <Link href="/login" className="text-sm hover:opacity-70">
          Sign in
        </Link>
      </header>

      <div className="flex-1 flex items-center">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-16">
          <p
            data-reveal
            className="mono text-xs uppercase tracking-[0.3em] mb-6"
            style={{ color: "var(--accent)" }}
          >
            Campaigns / Sessions / One-shots
          </p>

          <h1
            data-reveal
            className="display leading-[0.9] mb-6"
            style={{ fontSize: "clamp(3rem, 10vw, 6.5rem)", transitionDelay: "0.1s" }}
          >
            EVERY HOUR YOU HAVE
            <br />
            SPENT AT THE TABLE,
            <br />
            <span style={{ color: "var(--accent)" }}>COUNTED.</span>
          </h1>

          <p
            data-reveal
            className="max-w-lg mb-10"
            style={{ color: "var(--muted)", transitionDelay: "0.2s" }}
          >
            Log every D&D session the way you already track it on a spreadsheet, only
            better. Rolltrack adds up the hours, breaks them down by DM, arc, and month,
            and keeps the whole campaign log in one place.
          </p>

          <div data-reveal className="flex gap-3 flex-wrap" style={{ transitionDelay: "0.3s" }}>
            <Link href="/signup" className="btn">
              Start your log
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="marquee py-6"
        style={{ borderTop: "1px solid var(--ink-line)" }}
      >
        <div className="marquee-track">
          <span className="display outline-text text-5xl sm:text-6xl whitespace-nowrap pr-8">
            {marqueeRun}
          </span>
          <span className="display outline-text text-5xl sm:text-6xl whitespace-nowrap pr-8">
            {marqueeRun}
          </span>
        </div>
      </div>

      <Footer />
    </main>
  );
}

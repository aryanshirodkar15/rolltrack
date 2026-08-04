import Link from "next/link";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header
        className="max-w-3xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--ink-line)" }}
      >
        <Link href="/" className="display text-xl tracking-wide">
          ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
        </Link>
        <Link href="/login" className="text-sm hover:opacity-70">
          Sign in
        </Link>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-14 space-y-6">
        <h1 className="display text-5xl">ABOUT</h1>
        <p style={{ color: "var(--paper)" }}>
          Rolltrack is a session log for tabletop role-playing games. It started as a
          spreadsheet: one row per night, with the date, who ran it, who showed up, and how
          long you played. This is that spreadsheet, made to do the sums for you.
        </p>
        <p style={{ color: "var(--muted)" }}>
          Log a campaign, then add a session each time you play. Rolltrack totals the hours,
          breaks them down by DM, arc, and month, tracks your party level over time, and keeps
          the whole story recap in one place you can actually search.
        </p>
        <p style={{ color: "var(--muted)" }}>
          It is a personal, non-commercial hobby project. No ads, no payments, nothing for
          sale. Not affiliated with or endorsed by Wizards of the Coast.
        </p>
        <div className="pt-2">
          <Link href="/signup" className="btn text-sm">
            Start your log
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-16" style={{ borderTop: "1px solid var(--ink-line)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="min-w-0">
          <span className="display text-base tracking-wide">
            ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
          </span>
          <p className="text-xs mt-1.5" style={{ color: "var(--paper)" }}>
            A personal, non-commercial hobby project. Free to use, with no ads, no payments,
            and nothing for sale.
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
            &copy; 2026 Aryan Shirodkar. All rights reserved.
          </p>
        </div>

        <nav className="sm:ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <Link href="/about" className="hover:opacity-70" style={{ color: "var(--muted)" }}>
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}

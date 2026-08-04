import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import NavLinks from "@/components/NavLinks";
import Footer from "@/components/Footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = session.user.name ?? "You";
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "R";

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-20">
        <div
          className="backdrop-blur-md"
          style={{
            background: "rgba(20, 17, 13, 0.72)",
            borderBottom: "1px solid var(--ink-line)",
          }}
        >
          <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-5">
            {/* Mark + wordmark. The mark alone carries small screens. */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0" title="Rolltrack">
              <span
                className="w-7 h-7 flex items-center justify-center display text-base leading-none"
                style={{ background: "var(--accent)", color: "var(--ink)" }}
              >
                R
              </span>
              <span className="display text-lg tracking-wide hidden md:inline">
                ROLL<span style={{ color: "var(--accent)" }}>TRACK</span>
              </span>
            </Link>

            <span className="hidden sm:block h-5 w-px shrink-0" style={{ background: "var(--ink-line)" }} />

            <NavLinks />

            <div className="ml-auto shrink-0 flex items-center gap-2">
              <Link
                href="/profile"
                className="header-chip w-8 h-8 mono text-[10px] font-semibold"
                title={`${name}: profile`}
                aria-label="Profile"
              >
                {initials}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  className="header-chip w-8 h-8 text-xs"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  ⏻
                </button>
              </form>
            </div>
          </div>
        </div>
        {/* Accent hairline, which fills left to right as the page is read. */}
        <div className="h-px w-full relative overflow-hidden" style={{ background: "var(--ink-line)" }}>
          <div
            className="scroll-progress absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, var(--accent), color-mix(in srgb, var(--accent) 45%, transparent))",
              opacity: 0.75,
            }}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">{children}</main>
      <Footer />
    </div>
  );
}

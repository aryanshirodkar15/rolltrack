import { auth, signOut } from "@/lib/auth";
import { db } from "@/db";
import { users, campaigns, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { summarize } from "@/lib/stats";
import { formatDuration } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const [user, camps, sess] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(campaigns).where(eq(campaigns.userId, userId)).all(),
    db.select().from(sessions).where(eq(sessions.userId, userId)).all(),
  ]);

  const s = summarize(sess, camps);
  const since = user?.createdAt ? String(user.createdAt).slice(0, 10) : null;

  const rows: [string, string][] = [
    ["Name", user?.name ?? "--"],
    ["Username", user?.username ? `@${user.username}` : "--"],
    ["Email", user?.email ?? "--"],
  ];

  return (
    <div className="space-y-10 max-w-2xl">
      <section data-reveal>
        <h1 className="display text-5xl">YOUR ACCOUNT</h1>
        {since && (
          <p className="mono text-xs mt-2" style={{ color: "var(--muted)" }}>
            Rolling with Rolltrack since {since}
          </p>
        )}
      </section>

      <section data-reveal className="panel divide-y" style={{ borderColor: "var(--ink-line)" }}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-4 px-5 py-4" style={{ borderColor: "var(--ink-line)" }}>
            <span className="mono text-[10px] uppercase tracking-widest w-24 shrink-0" style={{ color: "var(--muted)" }}>
              {label}
            </span>
            <span className="text-sm truncate">{value}</span>
          </div>
        ))}
      </section>

      <section
        data-reveal
        className="grid grid-cols-3 gap-px border"
        style={{ background: "var(--ink-line)", borderColor: "var(--ink-line)" }}
      >
        {[
          { label: "Hours", value: formatDuration(s.totalMinutes) },
          { label: "Sessions", value: String(s.sessionCount) },
          { label: "Campaigns", value: String(s.campaignCount) },
        ].map((stat) => (
          <div key={stat.label} className="p-5" style={{ background: "var(--ink)" }}>
            <p className="mono text-xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section data-reveal>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn-ghost text-sm">Sign out</button>
        </form>
      </section>
    </div>
  );
}

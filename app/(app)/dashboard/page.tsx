import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { summarize, minutesByMonth, loggedYears } from "@/lib/stats";
import { formatDuration } from "@/lib/sessions";
import CountUp from "@/components/CountUp";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const [camps, sess] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.userId, userId)).all(),
    db.select().from(sessions).where(eq(sessions.userId, userId)).all(),
  ]);

  const s = summarize(sess, camps);

  if (sess.length === 0) {
    return (
      <div className="space-y-8">
        <div data-reveal className="pt-10 pb-4 text-center">
          <h1 className="display text-5xl mb-3">NOTHING LOGGED YET</h1>
          <p className="max-w-md mx-auto" style={{ color: "var(--muted)" }}>
            {camps.length === 0
              ? "Start a campaign, then log your first session. The hours count up from there."
              : "Log your first session and this page fills with your hours at the table."}
          </p>
        </div>
        <div data-reveal className="flex justify-center gap-3">
          <Link href="/campaigns" className="btn text-sm">
            {camps.length === 0 ? "Start a campaign" : "Your campaigns"}
          </Link>
          {camps.length > 0 && (
            <Link href="/log" className="btn-ghost text-sm">
              Log a session
            </Link>
          )}
        </div>
      </div>
    );
  }

  const maxDM = s.hoursByDM[0]?.minutes ?? 1;
  const year = loggedYears(sess)[0] ?? new Date().getUTCFullYear();
  const months = minutesByMonth(sess, year);
  const maxMonth = Math.max(1, ...months.map((m) => m.minutes));
  const maxPlayer = s.topPlayers[0]?.count ?? 1;

  return (
    <div className="space-y-14">
      {/* Hero: hours at the table */}
      <section data-reveal>
        <p className="mono text-xs uppercase tracking-[0.3em] mb-4" style={{ color: "var(--accent)" }}>
          Total time at the table
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="mono font-semibold tabular-nums leading-none"
            style={{ fontSize: "clamp(3.5rem, 12vw, 7rem)" }}
          >
            <CountUp value={s.totalHours} />
          </span>
          <span className="display text-3xl" style={{ color: "var(--muted)" }}>
            HOURS
          </span>
        </div>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          That is {s.totalDays} days of rolling dice, across {s.sessionCount}{" "}
          {s.sessionCount === 1 ? "session" : "sessions"} and {s.campaignCount}{" "}
          {s.campaignCount === 1 ? "campaign" : "campaigns"}.
        </p>
      </section>

      {/* Counters */}
      <section
        data-reveal
        className="grid grid-cols-2 md:grid-cols-4 gap-px border"
        style={{ background: "var(--ink-line)", borderColor: "var(--ink-line)" }}
      >
        {[
          { label: "Sessions", value: String(s.sessionCount) },
          { label: "Active games", value: String(s.activeCampaigns) },
          { label: "Avg session", value: s.avgSessionMinutes ? formatDuration(s.avgSessionMinutes) : "--" },
          { label: "Days between", value: s.avgDaysBetween != null ? String(s.avgDaysBetween) : "--" },
        ].map((stat) => (
          <div key={stat.label} className="p-5" style={{ background: "var(--ink)" }}>
            <p className="mono text-2xl md:text-3xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* Where the hours went: by DM */}
      {s.hoursByDM.length > 0 && (
        <section data-reveal>
          <h2 className="display text-2xl mb-1">WHO RAN THE TABLE</h2>
          <p className="mono text-[10px] uppercase tracking-wider mb-5" style={{ color: "var(--accent)" }}>
            Hours behind the screen, by DM
          </p>
          <div className="space-y-3">
            {s.hoursByDM.map((g, idx) => (
              <div key={g.name} className="flex items-center gap-4">
                <span className="w-32 shrink-0 text-sm truncate">{g.name}</span>
                <div className="flex-1 h-2.5 overflow-hidden" style={{ background: "var(--ink-raised)" }}>
                  <div
                    className="h-full growbar"
                    style={{
                      width: `${(g.minutes / maxDM) * 100}%`,
                      background: "var(--accent)",
                      transitionDelay: `${0.2 + idx * 0.09}s`,
                    }}
                  />
                </div>
                <span className="mono text-xs tabular-nums w-20 text-right" style={{ color: "var(--muted)" }}>
                  {formatDuration(g.minutes)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hours by month */}
      <section data-reveal>
        <h2 className="display text-2xl mb-1">THE YEAR IN SESSIONS</h2>
        <p className="mono text-[10px] uppercase tracking-wider mb-5" style={{ color: "var(--accent)" }}>
          Hours at the table each month · {year}
        </p>
        <div className="flex items-end gap-1.5 sm:gap-2 h-40">
          {months.map((m, idx) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full flex items-end justify-center h-full">
                <div
                  className="w-full growbar"
                  title={`${m.month}: ${formatDuration(m.minutes)}`}
                  style={{
                    height: `${(m.minutes / maxMonth) * 100}%`,
                    minHeight: m.minutes > 0 ? "3px" : "0",
                    background: "var(--accent)",
                    transformOrigin: "bottom",
                    transitionDelay: `${0.15 + idx * 0.04}s`,
                  }}
                />
              </div>
              <span className="mono text-[9px] sm:text-[10px]" style={{ color: "var(--muted)" }}>
                {m.month[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Longest session */}
      {s.longest && (
        <section data-reveal className="frame p-5 panel">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
            Longest single session
          </p>
          <p className="display text-2xl">
            {formatDuration(s.longest.minutes)}
            {s.longest.arc ? ` · ${s.longest.arc}` : ""}
          </p>
          {s.longest.summary && (
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {s.longest.summary}
            </p>
          )}
        </section>
      )}

      {/* Who shows up */}
      {s.topPlayers.length > 0 && (
        <section data-reveal>
          <h2 className="display text-2xl mb-5">WHO SHOWS UP</h2>
          <div data-stagger className="flex flex-wrap gap-2">
            {s.topPlayers.map((p) => (
              <span key={p.name} className="tag" style={{ color: "var(--paper)" }}>
                {p.name}
                <span className="mono" style={{ color: "var(--accent)" }}>
                  {p.count}
                </span>
              </span>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
            Nights at the table, counting attendance across every campaign.
          </p>
        </section>
      )}

      {/* Per campaign */}
      {s.byCampaign.length > 0 && (
        <section data-reveal>
          <h2 className="display text-2xl mb-5">BY CAMPAIGN</h2>
          <div className="space-y-2">
            {s.byCampaign.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="panel px-4 py-3 flex items-center gap-3"
              >
                <span className="text-sm font-semibold truncate">{c.name}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {c.sessionCount} {c.sessionCount === 1 ? "session" : "sessions"}
                </span>
                <span className="mono text-sm tabular-nums ml-auto" style={{ color: "var(--accent)" }}>
                  {formatDuration(c.minutes)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

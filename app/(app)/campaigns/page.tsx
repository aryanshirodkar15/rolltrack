import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { summarize } from "@/lib/stats";
import { formatDuration } from "@/lib/sessions";
import CampaignForm from "@/components/CampaignForm";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  finished: "Finished",
  abandoned: "Abandoned",
};

export default async function CampaignsPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const [camps, sess] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.userId, userId)).all(),
    db.select().from(sessions).where(eq(sessions.userId, userId)).all(),
  ]);

  const s = summarize(sess, camps);
  const byId = new Map(s.byCampaign.map((c) => [c.id, c]));

  return (
    <div className="space-y-10">
      <section data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">CAMPAIGNS</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Every table you keep. Open one to log its nights and see where the hours went.
          </p>
        </div>
        <CampaignForm />
      </section>

      {camps.length === 0 ? (
        <div data-reveal className="frame panel p-10 text-center">
          <p className="display text-2xl mb-2">NO CAMPAIGNS YET</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Start one above, then log the sessions you play into it.
          </p>
        </div>
      ) : (
        <section data-reveal>
          <div data-stagger className="grid sm:grid-cols-2 gap-4">
            {[...camps]
              .sort((a, b) => (byId.get(b.id)?.minutes ?? 0) - (byId.get(a.id)?.minutes ?? 0))
              .map((c) => {
                const roll = byId.get(c.id);
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="panel p-5 block">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="display text-2xl leading-none">{c.name}</h2>
                      <span className="tag shrink-0">{STATUS_LABELS[c.status] ?? c.status}</span>
                    </div>
                    <p className="mono text-xs mt-2" style={{ color: "var(--muted)" }}>
                      {c.system}
                      {c.dm ? ` · DM ${c.dm}` : ""}
                      {c.setting ? ` · ${c.setting}` : ""}
                    </p>
                    <div className="flex items-baseline gap-4 mt-4">
                      <span className="mono text-2xl font-semibold tabular-nums">
                        {formatDuration(roll?.minutes ?? 0)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {roll?.sessionCount ?? 0}{" "}
                        {roll?.sessionCount === 1 ? "session" : "sessions"}
                        {roll?.latestLevel != null ? ` · level ${roll.latestLevel}` : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

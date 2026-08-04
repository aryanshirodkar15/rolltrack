import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns, sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { arcBreakdown } from "@/lib/stats";
import { formatDuration } from "@/lib/sessions";
import SessionForm from "@/components/SessionForm";
import SessionList from "@/components/SessionList";
import CampaignControls from "@/components/CampaignControls";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const campaign = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .get();
  if (!campaign) notFound();

  const sess = await db.select().from(sessions).where(eq(sessions.campaignId, id)).all();

  const totalMinutes = sess.reduce((sum, s) => sum + s.minutes, 0);
  const withTime = sess.filter((s) => s.minutes > 0);
  const avg = withTime.length
    ? Math.round(withTime.reduce((s, x) => s + x.minutes, 0) / withTime.length)
    : 0;
  const latest = [...sess].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const arcs = arcBreakdown(
    [...sess].sort((a, b) =>
      a.date === b.date ? a.sessionNumber - b.sessionNumber : a.date < b.date ? -1 : 1
    )
  );
  const maxArc = Math.max(1, ...arcs.map((a) => a.minutes));

  const stats = [
    { label: "Hours played", value: formatDuration(totalMinutes) },
    { label: "Sessions", value: String(sess.length) },
    { label: "Avg session", value: avg ? formatDuration(avg) : "--" },
    { label: "Party level", value: latest?.level != null ? String(latest.level) : "--" },
  ];

  return (
    <div className="space-y-12">
      <Link href="/campaigns" className="mono text-xs hover:opacity-70" style={{ color: "var(--muted)" }}>
        ← All campaigns
      </Link>

      {/* Header */}
      <section data-reveal className="space-y-4">
        <div>
          <h1 className="display text-5xl">{campaign.name}</h1>
          <p className="mono text-xs mt-2" style={{ color: "var(--muted)" }}>
            {campaign.system}
            {campaign.dm ? ` · DM ${campaign.dm}` : ""}
            {campaign.setting ? ` · ${campaign.setting}` : ""}
          </p>
        </div>
        <CampaignControls id={campaign.id} status={campaign.status} name={campaign.name} />
      </section>

      {/* Counters */}
      <section
        data-reveal
        className="grid grid-cols-2 md:grid-cols-4 gap-px border"
        style={{ background: "var(--ink-line)", borderColor: "var(--ink-line)" }}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="p-5" style={{ background: "var(--ink)" }}>
            <p className="mono text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* Arc breakdown */}
      {arcs.length > 0 && (arcs.length > 1 || arcs[0].arc !== "Unsorted") && (
        <section data-reveal>
          <h2 className="display text-2xl mb-5">ARCS</h2>
          <div className="space-y-3">
            {arcs.map((a, idx) => (
              <div key={a.arc} className="flex items-center gap-4">
                <span className="w-40 shrink-0 text-sm truncate">{a.arc}</span>
                <div className="flex-1 h-2.5 overflow-hidden" style={{ background: "var(--ink-raised)" }}>
                  <div
                    className="h-full growbar"
                    style={{
                      width: `${(a.minutes / maxArc) * 100}%`,
                      background: "var(--accent)",
                      transitionDelay: `${0.2 + idx * 0.09}s`,
                    }}
                  />
                </div>
                <span className="mono text-xs tabular-nums w-24 text-right" style={{ color: "var(--muted)" }}>
                  {formatDuration(a.minutes)}
                  <span className="opacity-60"> · {a.sessionCount}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Log a session */}
      <section data-reveal>
        <h2 className="display text-2xl mb-5">LOG A SESSION</h2>
        <SessionForm
          campaigns={[{ id: campaign.id, name: campaign.name, dm: campaign.dm }]}
          fixedCampaignId={campaign.id}
          defaults={{
            dm: latest?.dm || campaign.dm,
            level: latest?.level ?? null,
            arc: latest?.arc ?? "",
            players: latest?.players ?? "",
          }}
        />
      </section>

      {/* Sessions */}
      <section data-reveal>
        <h2 className="display text-2xl mb-5">
          THE LOG <span style={{ color: "var(--muted)" }}>({sess.length})</span>
        </h2>
        <SessionList sessions={sess} />
      </section>
    </div>
  );
}

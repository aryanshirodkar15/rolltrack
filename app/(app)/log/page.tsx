import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import SessionForm from "@/components/SessionForm";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const camps = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.updatedAt))
    .all();

  return (
    <div className="space-y-8">
      <section data-reveal>
        <h1 className="display text-5xl">LOG A SESSION</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          One row per night at the table. Start and end times turn into the hours that add up.
        </p>
      </section>

      {camps.length === 0 ? (
        <div data-reveal className="frame panel p-10 text-center">
          <p className="display text-2xl mb-2">NO CAMPAIGNS YET</p>
          <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
            A session belongs to a campaign. Create one first.
          </p>
          <Link href="/campaigns" className="btn text-sm inline-block">
            Go to campaigns
          </Link>
        </div>
      ) : (
        <section data-reveal>
          <SessionForm campaigns={camps.map((c) => ({ id: c.id, name: c.name, dm: c.dm }))} />
        </section>
      )}
    </div>
  );
}

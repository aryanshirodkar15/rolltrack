import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns, sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { durationMinutes } from "@/lib/sessions";

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// A field that is either a whole number in [min, max] or null. Returns
// `undefined` when the input can't be used, so the caller can reject it.
function optInt(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

function optTime(value: unknown): string | null {
  const t = clean(value, 5);
  return /^(\d{1,2}):(\d{2})$/.test(t) ? t : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));

  const campaignId = clean(body.campaignId, 40);
  const campaign = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .get();
  if (!campaign) return NextResponse.json({ error: "Unknown campaign." }, { status: 400 });

  const date = clean(body.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a valid date." }, { status: 400 });
  }

  const level = optInt(body.level, 1, 30);
  if (level === undefined) return NextResponse.json({ error: "Level must be 1-30." }, { status: 400 });
  const gameDays = optInt(body.gameDays, 0, 100000);
  if (gameDays === undefined) return NextResponse.json({ error: "Game days looks off." }, { status: 400 });

  let rating: number | null = null;
  if (body.rating !== null && body.rating !== undefined && body.rating !== "") {
    const r = Number(body.rating);
    if (isNaN(r) || r < 1 || r > 10) {
      return NextResponse.json({ error: "Rating must be 1-10." }, { status: 400 });
    }
    rating = Math.round(r * 10) / 10;
  }

  const startTime = optTime(body.startTime);
  const endTime = optTime(body.endTime);

  // Prefer an explicit minute count; otherwise derive it from the clock
  // times, the way the spreadsheet did.
  let minutes = 0;
  const explicit = optInt(body.minutes, 0, 24 * 60);
  if (explicit === undefined) return NextResponse.json({ error: "Minutes looks off." }, { status: 400 });
  if (explicit && explicit > 0) {
    minutes = explicit;
  } else {
    const derived = durationMinutes(startTime, endTime);
    if (derived != null) minutes = derived;
  }

  // Session number: honour an explicit one, else continue the campaign's run.
  let sessionNumber = optInt(body.sessionNumber, 1, 100000) ?? null;
  if (sessionNumber == null) {
    const existing = await db
      .select({ n: sessions.sessionNumber })
      .from(sessions)
      .where(eq(sessions.campaignId, campaignId))
      .all();
    sessionNumber = existing.reduce((max, r) => Math.max(max, r.n), 0) + 1;
  }

  const id = randomUUID();
  await db.insert(sessions).values({
    id,
    userId,
    campaignId,
    sessionNumber,
    date,
    arc: clean(body.arc, 120),
    gameDays: gameDays ?? null,
    level: level ?? null,
    summary: clean(body.summary, 4000),
    dm: clean(body.dm, 60) || campaign.dm,
    location: clean(body.location, 80),
    players: clean(body.players, 500),
    startTime,
    endTime,
    minutes,
    rating,
  });

  // Touch the campaign so its "last updated" reflects the new night, without
  // overriding a status the owner set deliberately (a one-shot stays finished).
  await db
    .update(campaigns)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(campaigns.id, campaignId));

  const created = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  return NextResponse.json({ session: created });
}

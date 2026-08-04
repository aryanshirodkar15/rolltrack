import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { durationMinutes } from "@/lib/sessions";

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const existing = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};

  if ("date" in body) {
    const date = clean(body.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Pick a valid date." }, { status: 400 });
    }
    changes.date = date;
  }
  if ("title" in body) changes.title = clean(body.title, 120);
  if ("arc" in body) changes.arc = clean(body.arc, 120);
  if ("summary" in body) changes.summary = clean(body.summary, 4000);
  if ("dm" in body) changes.dm = clean(body.dm, 60);
  if ("location" in body) changes.location = clean(body.location, 80);
  if ("players" in body) changes.players = clean(body.players, 500);

  if ("level" in body) {
    const level = optInt(body.level, 1, 30);
    if (level === undefined) return NextResponse.json({ error: "Level must be 1-30." }, { status: 400 });
    changes.level = level;
  }
  if ("gameDays" in body) {
    const gd = optInt(body.gameDays, 0, 100000);
    if (gd === undefined) return NextResponse.json({ error: "Game days looks off." }, { status: 400 });
    changes.gameDays = gd;
  }
  if ("sessionNumber" in body) {
    const n = optInt(body.sessionNumber, 1, 100000);
    if (n === undefined || n === null) {
      return NextResponse.json({ error: "Session number looks off." }, { status: 400 });
    }
    changes.sessionNumber = n;
  }
  if ("rating" in body) {
    if (body.rating === null || body.rating === "") {
      changes.rating = null;
    } else {
      const r = Number(body.rating);
      if (isNaN(r) || r < 1 || r > 10) {
        return NextResponse.json({ error: "Rating must be 1-10." }, { status: 400 });
      }
      changes.rating = Math.round(r * 10) / 10;
    }
  }

  // Times and minutes move together: if either clock time changes, and no
  // explicit minute count is sent, recompute the length from the clock.
  const startTime = "startTime" in body ? optTime(body.startTime) : existing.startTime;
  const endTime = "endTime" in body ? optTime(body.endTime) : existing.endTime;
  if ("startTime" in body) changes.startTime = startTime;
  if ("endTime" in body) changes.endTime = endTime;

  if ("minutes" in body && body.minutes !== "" && body.minutes !== null) {
    const m = optInt(body.minutes, 0, 24 * 60);
    if (m === undefined) return NextResponse.json({ error: "Minutes looks off." }, { status: 400 });
    changes.minutes = m;
  } else if ("startTime" in body || "endTime" in body) {
    const derived = durationMinutes(startTime, endTime);
    if (derived != null) changes.minutes = derived;
  }

  await db.update(sessions).set(changes).where(eq(sessions.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
  return NextResponse.json({ ok: true });
}

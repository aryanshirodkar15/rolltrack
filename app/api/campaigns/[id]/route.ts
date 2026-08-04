import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns, sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const STATUSES = ["planned", "active", "finished", "abandoned"];

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};

  if ("name" in body) {
    const name = clean(body.name, 120);
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    changes.name = name;
  }
  if ("dm" in body) changes.dm = clean(body.dm, 60);
  if ("system" in body) changes.system = clean(body.system, 60) || "D&D 5e";
  if ("setting" in body) changes.setting = clean(body.setting, 120);
  if ("notes" in body) changes.notes = clean(body.notes, 4000);
  if ("status" in body) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    changes.status = body.status;
  }
  changes.updatedAt = new Date().toISOString();

  const owned = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .get();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(campaigns).set(changes).where(eq(campaigns.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const owned = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .get();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sessions carry the user_id too, but delete them by campaign so a removed
  // campaign never leaves orphaned nights behind.
  await db.delete(sessions).where(eq(sessions.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));

  return NextResponse.json({ ok: true });
}

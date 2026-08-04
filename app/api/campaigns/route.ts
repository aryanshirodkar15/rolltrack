import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const STATUSES = ["planned", "active", "finished", "abandoned"];

// Trim a field and enforce a max length, falling back to a default.
function clean(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt))
    .all();

  return NextResponse.json({ campaigns: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const name = clean(body.name, 120);
  if (!name) return NextResponse.json({ error: "Give the campaign a name." }, { status: 400 });

  const status = STATUSES.includes(body.status) ? body.status : "active";
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(campaigns).values({
    id,
    userId,
    name,
    dm: clean(body.dm, 60),
    system: clean(body.system, 60, "D&D 5e") || "D&D 5e",
    setting: clean(body.setting, 120),
    status,
    notes: clean(body.notes, 4000),
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  return NextResponse.json({ campaign: created });
}

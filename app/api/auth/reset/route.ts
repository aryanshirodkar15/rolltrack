import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { consumeToken } from "@/lib/authTokens";

// Finish a password reset.
export async function POST(req: Request) {
  const { token, password } = (await req.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be 8-128 characters." }, { status: 400 });
  }

  const claim = await consumeToken(String(token ?? ""), "reset");
  if (!claim) {
    return NextResponse.json(
      { error: "That reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const user = await db.select().from(users).where(eq(users.id, claim.userId)).get();
  if (!user) return NextResponse.json({ error: "Account no longer exists." }, { status: 404 });

  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .update(users)
    .set({
      passwordHash,
      // Reaching a reset link proves the address works, so an account stuck
      // unconfirmed is confirmed by getting here.
      emailVerified: user.emailVerified ?? Date.now(),
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true, email: user.email });
}

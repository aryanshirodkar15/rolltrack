import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { upsertGoogleUser, hasPassword } from "@/lib/googleUser";
import {
  clientIp,
  isRateLimited,
  recordAttempt,
  rateKey,
  LOGIN_FAILS_PER_ACCOUNT,
  LOGIN_FAILS_PER_IP,
  LOGIN_WINDOW_MS,
} from "@/lib/ratelimit";

// Google is optional: without credentials the provider is simply absent, and
// the sign-in pages ask NextAuth what exists rather than assuming.
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// Reasons a sign-in failed that the page should word differently. The code
// has to come from a subclass field: passing a string to CredentialsSignin
// only sets the message, and the client still receives code "credentials".
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}
class UseGoogleError extends CredentialsSignin {
  code = "UseGoogle";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required when running behind a proxy or on a non-canonical host.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password || password.length > 128) return null;

        // Brute force is guessing one person's password, so the account is
        // what gets the tight limit. The network limit is loose on purpose:
        // a shared office or campus address is one IP for everyone, and a
        // few colleagues mistyping must not lock the rest out. Successful
        // logins never count against either.
        const accountKey = rateKey("login:acct", email);
        const ipKey = rateKey("login:ip", clientIp(request as Request));
        const [accountLocked, networkLocked] = await Promise.all([
          isRateLimited(accountKey, LOGIN_FAILS_PER_ACCOUNT),
          isRateLimited(ipKey, LOGIN_FAILS_PER_IP),
        ]);
        if (accountLocked || networkLocked) return null;

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .get();

        // A Google account has no password, so there is nothing to compare
        // against and no password will ever open it.
        const valid =
          found && hasPassword(found.passwordHash)
            ? await bcrypt.compare(password, found.passwordHash)
            : false;
        if (!found || !valid) {
          await Promise.all([
            recordAttempt(accountKey, LOGIN_WINDOW_MS),
            recordAttempt(ipKey, LOGIN_WINDOW_MS),
          ]);
          if (found && !hasPassword(found.passwordHash)) {
            throw new UseGoogleError();
          }
          return null;
        }

        // Right password, unconfirmed address. Checked after the password so
        // this never reveals which emails have accounts.
        if (found.emailVerified == null) {
          throw new EmailNotVerifiedError();
        }

        return { id: found.id, name: found.name, email: found.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Google hands back its own account id, which means nothing to our
      // tables. Resolve it to the real user, creating them on first sign-in,
      // and carry that id instead.
      if (account?.provider === "google") {
        const email = (user?.email ?? token.email) as string | undefined;
        if (!email) return token;
        const id = await upsertGoogleUser(email, user?.name ?? (token.name as string | null));
        if (id) token.id = id;
        return token;
      }
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
});

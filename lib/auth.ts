import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, "") ?? "";

function logAuthEvent(event: string, details: Record<string, unknown> = {}) {
  console.log(`[auth] ${new Date().toISOString()} ${event}`, JSON.stringify(details));
}

export const authOptions: AuthOptions = {
  providers: [
    {
      id: "pocket-id",
      name: "Pocket ID",
      type: "oauth",
      wellKnown: `${issuer}/.well-known/openid-configuration`,
      // Pocket ID's token endpoint is not the standard /token path.
      token: `${issuer}/api/oidc/token`,
      authorization: { params: { scope: "openid profile email offline_access" } },
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile: { sub: string; email?: string; name?: string; preferred_username?: string }) {
        return {
          id: profile.sub,
          email: profile.email ?? null,
          name: profile.name ?? profile.preferred_username ?? profile.email ?? null,
        };
      },
    },
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-secret-change-in-production"),
  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.email) {
        logAuthEvent("signin.rejected", { reason: "missing sub or email" });
        return false;
      }
      const sub = user.id;
      const email = user.email;

      const bySub = await prisma.user.findUnique({ where: { oidcSub: sub } });
      if (bySub) {
        if (bySub.email !== email) {
          await prisma.user.update({ where: { id: bySub.id }, data: { email } });
        }
        return true;
      }

      // Adopt a pre-existing row (e.g. the old password admin) that has no sub yet.
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail && !byEmail.oidcSub) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { oidcSub: sub } });
      } else if (!byEmail) {
        await prisma.user.create({ data: { email, oidcSub: sub } });
      } else {
        logAuthEvent("signin.rejected", { reason: "email bound to another sub" });
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { oidcSub: user.id } });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "number") {
        (session.user as { id?: number }).id = token.userId;
      }
      return session;
    },
  },
};

export async function getSessionUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: number } | undefined)?.id;
  return typeof id === "number" ? id : null;
}

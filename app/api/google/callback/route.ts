import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/auth";
import { createCalendar, exchangeCode } from "@/lib/google";
import { syncAccount } from "@/lib/google-sync";

function redirectToSettings(req: NextRequest, status: string) {
  const base = process.env.NEXTAUTH_URL ?? req.url;
  const res = NextResponse.redirect(new URL(`/settings?google=${status}`, base));
  res.cookies.delete({ name: "gcal_state", path: "/api/google" });
  return res;
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("gcal_state")?.value;

  if (req.nextUrl.searchParams.get("error") || !code || !state || !cookieState) {
    return redirectToSettings(req, "denied");
  }
  const a = Buffer.from(state);
  const b = Buffer.from(cookieState);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return redirectToSettings(req, "invalid_state");
  }

  try {
    const tokens = await exchangeCode(code);
    const existing = await prisma.googleAccount.findUnique({ where: { userId } });
    // Google omits the refresh token on repeat consent for some flows; keep the stored one then.
    if (!tokens.refresh_token && !existing) return redirectToSettings(req, "no_refresh_token");

    const data = {
      googleEmail: tokens.email,
      encryptedAccessToken: encrypt(tokens.access_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      lastSyncError: null,
      ...(tokens.refresh_token ? { encryptedRefreshToken: encrypt(tokens.refresh_token) } : {}),
    };

    let account;
    if (existing) {
      account = await prisma.googleAccount.update({ where: { id: existing.id }, data });
    } else {
      const calendarId = await createCalendar(tokens.access_token);
      account = await prisma.googleAccount.create({
        data: {
          ...data,
          userId,
          calendarId,
          encryptedRefreshToken: encrypt(tokens.refresh_token!),
        },
      });
    }

    syncAccount(account.id, { force: true }).catch((e) => console.error("[google-sync]", e));
    return redirectToSettings(req, "connected");
  } catch (e) {
    console.error("[google-oauth]", e instanceof Error ? e.message : e);
    return redirectToSettings(req, "error");
  }
}

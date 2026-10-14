import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionUserId } from "@/lib/auth";
import { assertEncryptionKey } from "@/lib/crypto";
import { buildAuthUrl } from "@/lib/google";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Better to fail before the consent screen than after Google already granted access.
  try {
    assertEncryptionKey();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server misconfigured" }, { status: 500 });
  }

  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("gcal_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}

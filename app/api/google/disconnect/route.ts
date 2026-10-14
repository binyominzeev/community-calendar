import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/auth";
import { revokeToken } from "@/lib/google";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (account) {
    try {
      await revokeToken(decrypt(account.encryptedRefreshToken));
    } catch {
      // Local cleanup proceeds even if the stored token cannot be decrypted or revoked.
    }
    await prisma.googleAccount.delete({ where: { id: account.id } });
  }
  return NextResponse.json({ ok: true });
}

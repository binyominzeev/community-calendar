import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.googleAccount.findUnique({
    where: { userId },
    select: {
      googleEmail: true,
      syncInProgress: true,
      syncTotal: true,
      syncDone: true,
      syncCurrent: true,
      lastSyncAt: true,
      lastSyncError: true,
    },
  });
  return NextResponse.json({ connected: Boolean(account), ...account });
}

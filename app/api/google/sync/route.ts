import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { syncAccount } from "@/lib/google-sync";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) return NextResponse.json({ error: "Google account not connected" }, { status: 404 });

  syncAccount(account.id, { force }).catch((e) => console.error("[google-sync]", e));
  return NextResponse.json({ started: true }, { status: 202 });
}

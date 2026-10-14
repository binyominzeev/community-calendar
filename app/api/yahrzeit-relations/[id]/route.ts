import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerSyncAll } from "@/lib/google-sync";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const option = await prisma.yahrzeitRelationOption.update({
    where: { id: parseInt(id) },
    data: { name: name.trim() },
  });

  triggerSyncAll();
  return NextResponse.json(option);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  await prisma.event.updateMany({
    where: { yahrzeitRelationOptionId: parseInt(id) },
    data: { yahrzeitRelationOptionId: null },
  });

  await prisma.yahrzeitRelationOption.delete({ where: { id: parseInt(id) } });
  triggerSyncAll();
  return NextResponse.json({ ok: true });
}

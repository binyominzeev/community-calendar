import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerSyncAll } from "@/lib/google-sync";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id: parseInt(id) },
    include: {
      personTags: { include: { tag: true } },
      events: { include: { eventType: true, yahrzeitRelationOption: true } },
    },
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { displayName, hebrewName, notes, tagIds } = body;

  if (!displayName?.trim()) {
    return NextResponse.json(
      { error: "displayName is required" },
      { status: 400 }
    );
  }

  const personId = parseInt(id);

  // Replace all tags
  await prisma.personTag.deleteMany({ where: { personId } });

  const person = await prisma.person.update({
    where: { id: personId },
    data: {
      displayName: displayName.trim(),
      hebrewName: hebrewName?.trim() || null,
      notes: notes?.trim() || null,
      personTags: tagIds?.length
        ? {
            create: tagIds.map((tagId: number) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      personTags: { include: { tag: true } },
      events: { include: { eventType: true, yahrzeitRelationOption: true } },
    },
  });

  triggerSyncAll();
  return NextResponse.json(person);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.person.delete({ where: { id: parseInt(id) } });
  triggerSyncAll();
  return NextResponse.json({ ok: true });
}

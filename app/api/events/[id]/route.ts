import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { eventTypeId, hebrewDay, hebrewMonth, remarks } = body;

  if (!eventTypeId || !hebrewDay || !hebrewMonth) {
    return NextResponse.json(
      { error: "eventTypeId, hebrewDay, hebrewMonth are required" },
      { status: 400 }
    );
  }

  if (hebrewDay < 1 || hebrewDay > 30 || hebrewMonth < 1 || hebrewMonth > 13) {
    return NextResponse.json(
      { error: "Invalid Hebrew date" },
      { status: 400 }
    );
  }

  const event = await prisma.event.update({
    where: { id: parseInt(id) },
    data: {
      eventTypeId: parseInt(eventTypeId),
      hebrewDay: parseInt(hebrewDay),
      hebrewMonth: parseInt(hebrewMonth),
      remarks: remarks?.trim() || null,
    },
    include: {
      eventType: true,
      person: {
        include: { personTags: { include: { tag: true } } },
      },
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.event.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}

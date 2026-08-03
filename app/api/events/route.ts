import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");

  const events = await prisma.event.findMany({
    where: personId ? { personId: parseInt(personId) } : undefined,
    include: {
      eventType: true,
      person: {
        include: {
          personTags: { include: { tag: true } },
        },
      },
    },
    orderBy: [{ hebrewMonth: "asc" }, { hebrewDay: "asc" }],
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { personId, eventTypeId, hebrewDay, hebrewMonth, remarks } = body;

  if (!personId || !eventTypeId || !hebrewDay || !hebrewMonth) {
    return NextResponse.json(
      { error: "personId, eventTypeId, hebrewDay, hebrewMonth are required" },
      { status: 400 }
    );
  }

  if (hebrewDay < 1 || hebrewDay > 30 || hebrewMonth < 1 || hebrewMonth > 13) {
    return NextResponse.json(
      { error: "Invalid Hebrew date" },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({
    data: {
      personId: parseInt(personId),
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

  return NextResponse.json(event, { status: 201 });
}

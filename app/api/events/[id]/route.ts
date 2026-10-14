import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gregorianToHebrew } from "@/lib/hebcal";
import { triggerSyncAll } from "@/lib/google-sync";

type Params = { params: Promise<{ id: string }> };

function parseRequiredInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function parseOptionalInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function parseCivilDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    eventTypeId,
    hebrewDay,
    hebrewMonth,
    civilDate,
    eventYear,
    remarks,
    yahrzeitRelationOptionId,
  } = body;

  const parsedEventTypeId = parseRequiredInt(eventTypeId);
  if (!parsedEventTypeId) {
    return NextResponse.json(
      { error: "eventTypeId is required" },
      { status: 400 }
    );
  }

  const parsedCivilDate = parseCivilDate(civilDate);
  let resolvedHebrewDay: number;
  let resolvedHebrewMonth: number;

  if (parsedCivilDate) {
    const converted = gregorianToHebrew(parsedCivilDate);
    resolvedHebrewDay = converted.day;
    resolvedHebrewMonth = converted.month;
  } else {
    const parsedHebrewDay = parseRequiredInt(hebrewDay);
    const parsedHebrewMonth = parseRequiredInt(hebrewMonth);

    if (!parsedHebrewDay || !parsedHebrewMonth) {
      return NextResponse.json(
        { error: "Either civilDate or hebrewDay/hebrewMonth is required" },
        { status: 400 }
      );
    }

    resolvedHebrewDay = parsedHebrewDay;
    resolvedHebrewMonth = parsedHebrewMonth;
  }

  const parsedEventYear = parseOptionalInt(eventYear);
  if (eventYear !== undefined && eventYear !== null && eventYear !== "") {
    if (!parsedEventYear || parsedEventYear < 1 || parsedEventYear > 9999) {
      return NextResponse.json(
        { error: "Invalid event year" },
        { status: 400 }
      );
    }
  }

  if (resolvedHebrewDay < 1 || resolvedHebrewDay > 30 || resolvedHebrewMonth < 1 || resolvedHebrewMonth > 13) {
    return NextResponse.json(
      { error: "Invalid Hebrew date" },
      { status: 400 }
    );
  }

  const eventType = await prisma.eventType.findUnique({
    where: { id: parsedEventTypeId },
  });

  if (!eventType) {
    return NextResponse.json({ error: "Event type not found" }, { status: 400 });
  }

  const shouldSetYahrzeitRelation =
    eventType.isYahrzeit && yahrzeitRelationOptionId;

  const parsedYahrzeitRelationOptionId = parseOptionalInt(yahrzeitRelationOptionId);

  const event = await prisma.event.update({
    where: { id: parseInt(id) },
    data: {
      eventTypeId: parsedEventTypeId,
      yahrzeitRelationOptionId: shouldSetYahrzeitRelation
        ? parsedYahrzeitRelationOptionId
        : null,
      hebrewDay: resolvedHebrewDay,
      hebrewMonth: resolvedHebrewMonth,
      civilDate: parsedCivilDate,
      eventYear: parsedEventYear,
      remarks: remarks?.trim() || null,
    },
    include: {
      eventType: true,
      yahrzeitRelationOption: true,
      person: {
        include: { personTags: { include: { tag: true } } },
      },
    },
  });

  triggerSyncAll();
  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.event.delete({ where: { id: parseInt(id) } });
  triggerSyncAll();
  return NextResponse.json({ ok: true });
}

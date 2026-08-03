import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveEventsForYear, EventRecord } from "@/lib/hebcal";
import { createEvents, EventAttributes } from "ics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const tag = searchParams.get("tag") ?? "";
  const typeFilter = searchParams.get("type") ?? "";

  if (!yearParam) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const hebrewYear = parseInt(yearParam);
  if (isNaN(hebrewYear)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const dbEvents = await prisma.event.findMany({
    where: {
      AND: [
        tag
          ? { person: { personTags: { some: { tag: { name: tag } } } } }
          : {},
        typeFilter ? { eventType: { name: typeFilter } } : {},
      ],
    },
    include: {
      eventType: true,
      person: {
        include: {
          personTags: { include: { tag: true } },
        },
      },
    },
  });

  const resolved = resolveEventsForYear(dbEvents as EventRecord[], hebrewYear);

  const icsEvents: EventAttributes[] = resolved.map((ev) => {
    const d = ev.gregDate;
    return {
      title: `${ev.eventType}: ${ev.personName}`,
      description: ev.remarks ?? undefined,
      start: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
      duration: { days: 1 },
      productId: "community-calendar",
    };
  });

  const { error, value } = createEvents(icsEvents);
  if (error || !value) {
    return NextResponse.json({ error: "Failed to generate ICS" }, { status: 500 });
  }

  return new NextResponse(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="community-calendar-${hebrewYear}.ics"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveEventsForYear, EventRecord } from "@/lib/hebcal";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const tag = searchParams.get("tag") ?? "";
  const typeFilter = searchParams.get("type") ?? "";

  if (!yearParam) {
    return NextResponse.json(
      { error: "year parameter is required" },
      { status: 400 }
    );
  }

  const hebrewYear = parseInt(yearParam);
  if (isNaN(hebrewYear) || hebrewYear < 5000 || hebrewYear > 9999) {
    return NextResponse.json({ error: "Invalid Hebrew year" }, { status: 400 });
  }

  const events = await prisma.event.findMany({
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

  const resolved = resolveEventsForYear(events as EventRecord[], hebrewYear);

  // Serialize dates to ISO strings for JSON
  const serialized = resolved.map((e) => ({
    ...e,
    gregDate: e.gregDate.toISOString(),
  }));

  return NextResponse.json({
    hebrewYear,
    events: serialized,
  });
}

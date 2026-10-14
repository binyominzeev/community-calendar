import { NextRequest, NextResponse } from "next/server";
import { buildCalendarItems } from "@/lib/calendar-items";
import { hebrewYearRange } from "@/lib/hebcal";
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

  const { start, end } = hebrewYearRange(hebrewYear);
  const items = await buildCalendarItems(start, end, { tag, type: typeFilter });

  const icsEvents: EventAttributes[] = items.map((item) => {
    const [y, m, d] = item.date.split("-").map(Number);
    return {
      title: item.summary,
      description: item.description,
      start: [y, m, d],
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

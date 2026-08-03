import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveEventsForYear,
  EventRecord,
  isLeapYear,
  getMonthName,
  HebrewEvent,
} from "@/lib/hebcal";

const GREG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function groupByMonth(events: HebrewEvent[]): Map<string, HebrewEvent[]> {
  const map = new Map<string, HebrewEvent[]>();
  for (const ev of events) {
    const key = `${ev.gregDate.getFullYear()}-${ev.gregDate.getMonth()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

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
  const leap = isLeapYear(hebrewYear);
  const grouped = groupByMonth(resolved);

  const monthSections = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, events]) => {
      const [yearStr, monthStr] = key.split("-");
      const monthName = GREG_MONTHS[parseInt(monthStr)];
      const rows = events
        .map(
          (ev) =>
            `<tr>
              <td>${ev.gregDate.getDate()}</td>
              <td>${getMonthName(ev.month, leap)} ${ev.day}</td>
              <td>${ev.eventType}</td>
              <td>${ev.personName}</td>
              <td>${ev.remarks ?? ""}</td>
            </tr>`
        )
        .join("\n");

      return `
        <section>
          <h2>${monthName} ${yearStr}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hebrew Date</th>
                <th>Type</th>
                <th>Name</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Community Calendar ${hebrewYear}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2cm; color: #000; }
    h1 { text-align: center; margin-bottom: 1em; }
    h2 { border-bottom: 2px solid #333; padding-bottom: 4px; margin-top: 2em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    @media print {
      section { page-break-inside: avoid; }
      h2 { page-break-before: auto; }
    }
  </style>
</head>
<body>
  <h1>Community Calendar — Hebrew Year ${hebrewYear}</h1>
  ${monthSections}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

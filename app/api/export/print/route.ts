import { NextRequest, NextResponse } from "next/server";
import { HDate } from "@hebcal/core";
import { buildCalendarItems, CalendarItem } from "@/lib/calendar-items";
import { hebrewYearRange } from "@/lib/hebcal";

const GREG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function groupByMonth(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = item.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
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

  // Every item except the per-day Hebrew date, which would make the table unreadable.
  const { start, end } = hebrewYearRange(hebrewYear);
  const items = await buildCalendarItems(start, end, {
    tag,
    type: typeFilter,
    kinds: ["special", "event"],
  });
  const grouped = groupByMonth(items);

  const monthSections = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthItems]) => {
      const [yearStr, monthStr] = key.split("-");
      const monthName = GREG_MONTHS[parseInt(monthStr) - 1];
      const rows = monthItems
        .map((item) => {
          const [y, m, d] = item.date.split("-").map(Number);
          const hd = new HDate(new Date(y, m - 1, d, 12));
          return `<tr>
              <td>${d}</td>
              <td>${hd.getDate()} ${esc(hd.getMonthName())}</td>
              <td>${esc(item.eventType ?? "Calendar")}</td>
              <td>${esc(item.personName ?? item.summary)}</td>
              <td>${esc(item.remarks)}</td>
            </tr>`;
        })
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

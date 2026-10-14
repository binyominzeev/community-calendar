import { NextRequest, NextResponse } from "next/server";
import { buildCalendarItems } from "@/lib/calendar-items";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 400;

function parseDate(value: string | null): Date | null {
  if (!value || !DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return isNaN(date.getTime()) ? null : date;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag") ?? "";
  const typeFilter = searchParams.get("type") ?? "";
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (!from || !to || to < from) {
    return NextResponse.json(
      { error: "from and to (YYYY-MM-DD) are required" },
      { status: 400 }
    );
  }
  if ((to.getTime() - from.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  const items = await buildCalendarItems(from, to, { tag, type: typeFilter });
  return NextResponse.json({ items });
}

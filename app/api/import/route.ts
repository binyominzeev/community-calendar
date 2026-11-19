import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseHebrewDateString, parseGregorianDateString, gregorianToHebrew } from "@/lib/hebcal";
import { triggerSyncAll } from "@/lib/google-sync";

interface ImportRow {
  displayName: string;
  hebrewName?: string;
  notes?: string;
  tags?: string; // comma-separated tag names
  eventType?: string;
  civilDate?: string; // "2000-01-15" (YYYY-MM-DD)
  hebrewDate?: string; // e.g. "7 Tishrei"
  remarks?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array is required" }, { status: 400 });
  }

  const results: { row: number; status: string; message?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.displayName?.trim()) {
      results.push({ row: i, status: "error", message: "displayName is required" });
      continue;
    }

    try {
      // Find or create person
      let person = await prisma.person.findFirst({
        where: { displayName: { equals: row.displayName.trim() } },
      });

      if (!person) {
        person = await prisma.person.create({
          data: {
            displayName: row.displayName.trim(),
            hebrewName: row.hebrewName?.trim() || null,
            notes: row.notes?.trim() || null,
          },
        });
      } else if (row.hebrewName?.trim() || row.notes?.trim()) {
        person = await prisma.person.update({
          where: { id: person.id },
          data: {
            hebrewName: row.hebrewName?.trim() || person.hebrewName,
            notes: row.notes?.trim() || person.notes,
          },
        });
      }

      // Handle tags
      if (row.tags?.trim()) {
        const tagNames = row.tags.split(",").map((t) => t.trim()).filter(Boolean);
        for (const tagName of tagNames) {
          let tag = await prisma.tag.findUnique({ where: { name: tagName } });
          if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName } });
          }
          const existing = await prisma.personTag.findUnique({
            where: { personId_tagId: { personId: person.id, tagId: tag.id } },
          });
          if (!existing) {
            await prisma.personTag.create({
              data: { personId: person.id, tagId: tag.id },
            });
          }
        }
      }

      // Handle event
      if (row.eventType?.trim()) {
        // Parse dates: prioritize civilDate, fallback to hebrewDate
        let parsed: { day: number; month: number } | null = null;
        let civilDate: Date | null = null;
        let eventYear: number | null = null;

        if (row.civilDate?.trim()) {
          const gregorian = parseGregorianDateString(row.civilDate);
          if (gregorian) {
            civilDate = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
            eventYear = gregorian.year;
            const hebrew = gregorianToHebrew(civilDate);
            parsed = { day: hebrew.day, month: hebrew.month };
          } else {
            results.push({
              row: i,
              status: "partial",
              message: `Person created but invalid Gregorian date: ${row.civilDate}`,
            });
            continue;
          }
        } else if (row.hebrewDate?.trim()) {
          parsed = parseHebrewDateString(row.hebrewDate);
          if (!parsed) {
            results.push({
              row: i,
              status: "partial",
              message: `Person created but invalid Hebrew date: ${row.hebrewDate}`,
            });
            continue;
          }
        } else {
          results.push({
            row: i,
            status: "partial",
            message: `Person created but no valid date provided (need Gregorian YYYY-MM-DD or Hebrew "day Month")`,
          });
          continue;
        }

        let eventType = await prisma.eventType.findUnique({
          where: { name: row.eventType.trim() },
        });
        if (!eventType) {
          eventType = await prisma.eventType.create({
            data: { name: row.eventType.trim() },
          });
        }

        // Check for duplicate event
        const existingEvent = await prisma.event.findFirst({
          where: {
            personId: person.id,
            hebrewDay: parsed.day,
            hebrewMonth: parsed.month,
            eventTypeId: eventType.id,
          },
        });

        if (existingEvent) {
          results.push({
            row: i,
            status: "skipped",
            message: `Event already exists for ${person.displayName}`,
          });
        } else {
          await prisma.event.create({
            data: {
              personId: person.id,
              eventTypeId: eventType.id,
              hebrewDay: parsed.day,
              hebrewMonth: parsed.month,
              civilDate: civilDate,
              eventYear: eventYear,
              remarks: row.remarks?.trim() || null,
            },
          });
          results.push({ row: i, status: "ok" });
        }
      } else {
        results.push({ row: i, status: "ok" });
      }
    } catch (err) {
      results.push({
        row: i,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  triggerSyncAll();
  return NextResponse.json({ results });
}

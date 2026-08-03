import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const missing = searchParams.get("missing") ?? "";

  const people = await prisma.person.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { displayName: { contains: search } },
                { hebrewName: { contains: search } },
              ],
            }
          : {},
        tag
          ? { personTags: { some: { tag: { name: tag } } } }
          : {},
        missing === "hebrewName" ? { hebrewName: null } : {},
        missing === "birthday"
          ? {
              NOT: {
                events: { some: { eventType: { name: "Birthday" } } },
              },
            }
          : {},
        missing === "yahrzeit"
          ? {
              NOT: {
                events: { some: { eventType: { name: "Yahrzeit" } } },
              },
            }
          : {},
      ],
    },
    include: {
      personTags: { include: { tag: true } },
      events: { include: { eventType: true } },
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { displayName, hebrewName, notes, tagIds } = body;

  if (!displayName?.trim()) {
    return NextResponse.json(
      { error: "displayName is required" },
      { status: 400 }
    );
  }

  const person = await prisma.person.create({
    data: {
      displayName: displayName.trim(),
      hebrewName: hebrewName?.trim() || null,
      notes: notes?.trim() || null,
      personTags: tagIds?.length
        ? {
            create: tagIds.map((tagId: number) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      personTags: { include: { tag: true } },
      events: { include: { eventType: true } },
    },
  });

  return NextResponse.json(person, { status: 201 });
}

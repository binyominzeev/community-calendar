import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { personTags: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const tag = await prisma.tag.create({ data: { name: name.trim() } });
  return NextResponse.json(tag, { status: 201 });
}

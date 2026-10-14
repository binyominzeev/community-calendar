import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const options = await prisma.yahrzeitRelationOption.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const normalized = name.trim();

  const existing = await prisma.yahrzeitRelationOption.findFirst({
    where: { name: { equals: normalized } },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const option = await prisma.yahrzeitRelationOption.create({
    data: { name: normalized },
  });

  return NextResponse.json(option, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const types = await prisma.eventType.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const type = await prisma.eventType.create({ data: { name: name.trim() } });
  return NextResponse.json(type, { status: 201 });
}

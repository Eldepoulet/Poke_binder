import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SetMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sets = await prisma.set.findMany({ orderBy: [{ serieName: "asc" }, { name: "asc" }] });
  const payload: SetMeta[] = sets.map((s) => ({
    code: s.code,
    name: s.name,
    serieCode: s.serieCode,
    serieName: s.serieName,
    logo: s.logo,
    symbol: s.symbol,
    cardCount: s.cardCount,
  }));
  return NextResponse.json(payload);
}

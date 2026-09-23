import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import type { SetMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  // `Set.cardCount` (seedé depuis sets-meta.json) est en pratique souvent
  // désynchronisé du nombre réel de cartes chargées (secrètes/promos non
  // comptées à la source) — on lui préfère un comptage live sur Card, qui
  // sert aussi à calculer l'avancement affiché par tuile dans /collection.
  const [sets, totaux, possedees] = await Promise.all([
    prisma.set.findMany({ orderBy: [{ serieName: "asc" }, { name: "asc" }] }),
    prisma.card.groupBy({ by: ["set"], _count: { _all: true } }),
    prisma.collectionEntry.findMany({
      where: { userId },
      distinct: ["cardId"],
      select: { card: { select: { set: true } } },
    }),
  ]);

  const totalParSet = new Map(totaux.map((t) => [t.set, t._count._all]));
  const possedeesParSet = new Map<string, number>();
  for (const p of possedees) {
    possedeesParSet.set(p.card.set, (possedeesParSet.get(p.card.set) ?? 0) + 1);
  }

  const payload: SetMeta[] = sets.map((s) => ({
    code: s.code,
    name: s.name,
    serieCode: s.serieCode,
    serieName: s.serieName,
    logo: s.logo,
    symbol: s.symbol,
    cardCount: totalParSet.get(s.code) ?? s.cardCount,
    owned: possedeesParSet.get(s.code) ?? 0,
  }));
  return NextResponse.json(payload);
}

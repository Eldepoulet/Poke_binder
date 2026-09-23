import { prisma } from "@/lib/prisma";
import type { QuantiteMap } from "@/lib/types";

// Coche/décoche une variante depuis le classeur : upsert (idempotent) ou
// suppression d'une entrée "manuel" (langue="", état="") uniquement — ne
// touche jamais aux entrées "pokecardex" (une carte importée reste visible
// même si on décoche la case correspondante dans le classeur ; limite
// connue, le classeur reste "à peaufiner plus tard").
export async function toggleManuel(
  cardId: string,
  variante: "n" | "r" | "h" | "p" | "m",
  on: boolean,
  userId: string
): Promise<void> {
  if (on) {
    await prisma.collectionEntry.upsert({
      where: { userId_cardId_variante_langue_etat: { userId, cardId, variante, langue: "", etat: "" } },
      create: { cardId, variante, langue: "", etat: "", quantite: 1, source: "manuel", userId },
      update: {},
    });
  } else {
    await prisma.collectionEntry.deleteMany({
      where: { cardId, variante, langue: "", etat: "", source: "manuel", userId },
    });
  }
}

// Supprime TOUTE la possession (import CSV + cases cochées à la main dans
// les classeurs) — remet la collection à zéro pour cet utilisateur. Action
// destructrice : affecte immédiatement tous les classeurs (master et
// custom) de cet utilisateur, cf. binders.ts:possedeGlobal.
export async function resetCollection(userId: string): Promise<void> {
  await prisma.collectionEntry.deleteMany({ where: { userId } });
}

// Quantités possédées (toutes sources) pour chaque carte d'une extension —
// alimente la vue Collection (badges "N×2 · R×1", filtre "en double").
export async function quantitesPourSet(set: string, userId: string): Promise<QuantiteMap> {
  const rows = await prisma.collectionEntry.groupBy({
    by: ["cardId", "variante"],
    where: { userId, card: { set } },
    _sum: { quantite: true },
  });
  const map: QuantiteMap = {};
  for (const r of rows) {
    const qty = r._sum.quantite ?? 0;
    const q = map[r.cardId] ?? { n: 0, r: 0, h: 0, p: 0, m: 0 };
    if (r.variante === "n") q.n = qty;
    if (r.variante === "r") q.r = qty;
    if (r.variante === "h") q.h = qty;
    if (r.variante === "p") q.p = qty;
    if (r.variante === "m") q.m = qty;
    map[r.cardId] = q;
  }
  return map;
}

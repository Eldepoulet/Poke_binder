import { prisma } from "@/lib/prisma";
import type { QuantiteMap } from "@/lib/types";

const USER_ID = "local";

// Coche/décoche une variante depuis le classeur : upsert (idempotent) ou
// suppression d'une entrée "manuel" (langue="", état="") uniquement — ne
// touche jamais aux entrées "pokecardex" (une carte importée reste visible
// même si on décoche la case correspondante dans le classeur ; limite
// connue, le classeur reste "à peaufiner plus tard").
export async function toggleManuel(cardId: string, variante: "n" | "r" | "h", on: boolean): Promise<void> {
  if (on) {
    await prisma.collectionEntry.upsert({
      where: { cardId_variante_langue_etat: { cardId, variante, langue: "", etat: "" } },
      create: { cardId, variante, langue: "", etat: "", quantite: 1, source: "manuel", userId: USER_ID },
      update: {},
    });
  } else {
    await prisma.collectionEntry.deleteMany({
      where: { cardId, variante, langue: "", etat: "", source: "manuel", userId: USER_ID },
    });
  }
}

// Supprime TOUTE la possession (import CSV + cases cochées à la main dans
// les classeurs) — remet la collection à zéro pour cet utilisateur. Action
// destructrice et globale : affecte immédiatement tous les classeurs
// (master et custom), cf. binders.ts:possedeGlobal.
export async function resetCollection(): Promise<void> {
  await prisma.collectionEntry.deleteMany({ where: { userId: USER_ID } });
}

// Quantités possédées (toutes sources) pour chaque carte d'une extension —
// alimente la vue Collection (badges "N×2 · R×1", filtre "en double").
export async function quantitesPourSet(set: string): Promise<QuantiteMap> {
  const rows = await prisma.collectionEntry.groupBy({
    by: ["cardId", "variante"],
    where: { userId: USER_ID, card: { set } },
    _sum: { quantite: true },
  });
  const map: QuantiteMap = {};
  for (const r of rows) {
    const qty = r._sum.quantite ?? 0;
    const q = map[r.cardId] ?? { n: 0, r: 0, h: 0 };
    if (r.variante === "n") q.n = qty;
    if (r.variante === "r") q.r = qty;
    if (r.variante === "h") q.h = qty;
    map[r.cardId] = q;
  }
  return map;
}

import { prisma } from "@/lib/prisma";
import { ranger } from "@/lib/grille";
import type { BinderState, Carte, Case, ClasseurResume, Format, PossedeMap, TypeClasseur } from "@/lib/types";

const USER_ID = "local";

function carteDepuisCard(c: {
  id: string;
  set: string;
  numero: string;
  nom: string;
  rarete: string | null;
  categorie: string | null;
  illustrateur: string | null;
  hp: number | null;
  varNormal: boolean;
  varReverse: boolean;
  varHolo: boolean;
  imageLocal: string | null;
  imageUrl: string | null;
  imageLow: string | null;
}): Carte {
  return { ...c };
}

// La possession (CollectionEntry) est globale : posséder une carte ne dépend
// pas du classeur dans lequel elle est rangée. Chaque classeur charge donc
// la même carte complète des possessions (réduite à un booléen par variante
// pour l'UI du classeur — les quantités précises vivent dans la vue
// Collection, cf. lib/ownership.ts), quel que soit l'ensemble de cartes
// qu'il affiche.
async function possedeGlobal(): Promise<PossedeMap> {
  const rows = await prisma.collectionEntry.groupBy({
    by: ["cardId", "variante"],
    where: { userId: USER_ID },
    _sum: { quantite: true },
  });
  const possede: PossedeMap = {};
  for (const r of rows) {
    if ((r._sum.quantite ?? 0) <= 0) continue;
    const p = possede[r.cardId] ?? { n: false, r: false, h: false };
    if (r.variante === "n") p.n = true;
    if (r.variante === "r") p.r = true;
    if (r.variante === "h") p.h = true;
    possede[r.cardId] = p;
  }
  return possede;
}

function nomAffichable(b: { nom: string | null; type: string; set: string | null }, setRow?: { name: string } | null): string {
  if (b.type === "master") return setRow?.name ?? b.set ?? "Classeur";
  return b.nom ?? "Classeur";
}

export async function listBinders(): Promise<ClasseurResume[]> {
  const binders = await prisma.binder.findMany({ where: { userId: USER_ID }, orderBy: { updatedAt: "desc" } });
  const codes = [...new Set(binders.filter((b) => b.set).map((b) => b.set as string))];
  const sets = codes.length ? await prisma.set.findMany({ where: { code: { in: codes } } }) : [];
  const setByCode = new Map(sets.map((s) => [s.code, s]));

  return binders.map((b) => ({
    id: b.id,
    nom: nomAffichable(b, b.set ? setByCode.get(b.set) : null),
    type: b.type as TypeClasseur,
    set: b.set,
    updatedAt: b.updatedAt.toISOString(),
  }));
}

export async function getBinder(id: string): Promise<(BinderState & { possede: PossedeMap }) | null> {
  const binder = await prisma.binder.findUnique({ where: { id } });
  if (!binder) return null;

  const setRow = binder.set ? await prisma.set.findUnique({ where: { code: binder.set } }) : null;
  const possede = await possedeGlobal();

  let cases: Case[] = [];
  try {
    const parsed = JSON.parse(binder.casesJson);
    if (Array.isArray(parsed)) cases = parsed;
  } catch {
    cases = [];
  }

  const format: Format = [2, 3, 4].includes(binder.format) ? (binder.format as Format) : 3;

  return {
    id: binder.id,
    nom: nomAffichable(binder, setRow),
    type: binder.type as TypeClasseur,
    set: binder.set,
    format,
    cases,
    possede,
  };
}

export async function createBinder(
  input: { type: "custom"; nom: string } | { type: "master"; set: string }
): Promise<string> {
  const format: Format = 3;

  if (input.type === "custom") {
    const cases: Case[] = new Array(2 * format * format).fill(null);
    const binder = await prisma.binder.create({
      data: { nom: input.nom, type: "custom", format, casesJson: JSON.stringify(cases) },
    });
    return binder.id;
  }

  const cardsRaw = await prisma.card.findMany({ where: { set: input.set }, orderBy: { numero: "asc" } });
  const cartes: Carte[] = cardsRaw.map(carteDepuisCard);
  const cases = ranger([], format, cartes);
  const binder = await prisma.binder.create({
    data: { type: "master", set: input.set, format, casesJson: JSON.stringify(cases) },
  });
  return binder.id;
}

// Ne persiste plus que la disposition (format + cases) : la possession est
// désormais gérée à part (cf. lib/ownership.ts, appelée immédiatement au
// clic plutôt que via cette sauvegarde debounced) pour ne jamais écraser en
// bloc des entrées importées avec langue/état/quantité.
export async function saveBinder(id: string, next: { format: number; cases: Case[] }): Promise<void> {
  const format = [2, 3, 4].includes(next.format) ? next.format : 3;
  await prisma.binder.update({
    where: { id },
    data: { format, casesJson: JSON.stringify(next.cases) },
  });
}

export async function deleteBinder(id: string): Promise<void> {
  await prisma.binder.delete({ where: { id } });
}

// Retire les références à un visuel supprimé de tous les classeurs qui le
// contiennent (le visuel est une ressource globale, partagée entre classeurs).
export async function retirerVisuelDesClasseurs(visuelId: string): Promise<void> {
  const binders = await prisma.binder.findMany({ select: { id: true, casesJson: true } });
  for (const b of binders) {
    let cases: Case[];
    try {
      cases = JSON.parse(b.casesJson);
      if (!Array.isArray(cases)) continue;
    } catch {
      continue;
    }
    if (!cases.some((c) => c && c.t === "i" && c.a === visuelId)) continue;
    const nettoyees = cases.map((c) => (c && c.t === "i" && c.a === visuelId ? null : c));
    await prisma.binder.update({ where: { id: b.id }, data: { casesJson: JSON.stringify(nettoyees) } });
  }
}

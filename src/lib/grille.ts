// Logique de placement dans la grille du classeur, portée du POC.
// Fonctions pures : elles ne mutent jamais le tableau reçu, elles en
// renvoient un nouveau — pour s'intégrer proprement à setState React.

import type { Carte, Case, CaseVisuel, Format } from "./types";

export const parPage = (format: Format) => format * format;

export function nbPages(cases: Case[], format: Format): number {
  return Math.max(2, Math.ceil(cases.length / parPage(format)));
}

export function dimensionner(cases: Case[], format: Format): Case[] {
  const besoin = nbPages(cases, format) * parPage(format);
  if (cases.length >= besoin) return cases;
  return [...cases, ...new Array(besoin - cases.length).fill(null)];
}

export type Tuile = { e: CaseVisuel; c: number; r: number; w: number; h: number; ancre: number };

export function analyse(cases: Case[], format: Format, page: number) {
  const n = format;
  const base = page * parPage(format);
  const masquees = new Set<number>();
  const tuiles = new Map<number, Tuile>();

  for (let i = 0; i < parPage(format); i++) {
    const e = cases[base + i];
    if (!e || e.t !== "i") continue;
    const c0 = i % n;
    const r0 = Math.floor(i / n);
    const w = Math.min(e.w, n - c0);
    const h = Math.min(e.h, n - r0);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const k = (r0 + r) * n + (c0 + c);
        if (k === i) continue;
        if (e.mode === "tuile") tuiles.set(k, { e, c, r, w, h, ancre: base + i });
        else masquees.add(k);
      }
    }
  }
  return { masquees, tuiles };
}

export function libererZone(cases: Case[], format: Format, indice: number, w: number, h: number): Case[] {
  const n = format;
  const page = Math.floor(indice / parPage(format));
  const base = page * parPage(format);
  const local = indice - base;
  const c0 = local % n;
  const r0 = Math.floor(local / n);
  const next = [...cases];
  for (let r = 0; r < Math.min(h, n - r0); r++) {
    for (let c = 0; c < Math.min(w, n - c0); c++) {
      const k = base + (r0 + r) * n + (c0 + c);
      if (k !== indice) next[k] = null;
    }
  }
  return next;
}

export type Charge =
  | { t: "c"; id: string; variante?: "n" | "r" | "h" | "p" | "m" }
  | {
      t: "i";
      a: string;
      w?: number;
      h?: number;
      mode?: "continu" | "tuile";
      x?: number;
      y?: number;
      depuis?: number;
    };

export function placer(cases: Case[], format: Format, indice: number, charge: Charge): Case[] {
  if (charge.t === "c") {
    const next = [...cases];
    const remplace = next[indice];
    // La case cible détermine la variante quand la charge n'en précise pas
    // (dépôt depuis le tiroir/picker, qui ne connaît pas la notion de
    // variante) — préserve la structure d'un classeur "Normale + Reverse" :
    // remplacer une pochette "Reverse" par une autre carte garde sa case
    // "Reverse". Une charge qui précise déjà sa variante (déplacement d'une
    // pochette existante) l'emporte.
    const variante = charge.variante ?? (remplace && remplace.t === "c" ? remplace.variante : undefined);
    const actuel = next.findIndex((e) => e && e.t === "c" && e.id === charge.id && e.variante === variante);
    if (actuel !== -1) next[actuel] = remplace && remplace.t === "c" ? remplace : null;
    next[indice] = { t: "c", id: charge.id, variante };
    return next;
  }

  const e: CaseVisuel = {
    t: "i",
    a: charge.a,
    w: charge.w || 1,
    h: charge.h || 1,
    mode: charge.mode === "tuile" ? "tuile" : "continu",
    x: charge.x ?? 50,
    y: charge.y ?? 50,
  };
  let next = [...cases];
  if (typeof charge.depuis === "number") next[charge.depuis] = null;
  next = libererZone(next, format, indice, e.w, e.h);
  next[indice] = e;
  return next;
}

export type VarianteCarte = "n" | "r" | "h" | "p" | "m";

// Une carte peut occuper plusieurs cases (une par copie possédable) en mode
// "Normale + Reverse" : normale + reverse classique + reverse Poké Ball/
// Master Ball pour les cartes qui les ont (Évolutions Prismatiques, Foudre
// Noire, Flamme Blanche...). Le holo n'est utilisé qu'en repli, pour les
// cartes qui n'ont NI normale NI reverse (ex/rares en impression unique) —
// sinon la carte serait absente du classeur. Exportée : réutilisée telle
// quelle par la vue Normale/Reverse de la page Collection (même découpage
// carte → copies possédables, pour rester cohérent avec le classeur).
export function slotsPourCarte(c: Carte): VarianteCarte[] {
  const slots: VarianteCarte[] = [];
  if (c.varNormal) slots.push("n");
  if (c.varReverse) slots.push("r");
  if (c.varReversePokeball) slots.push("p");
  if (c.varReverseMasterball) slots.push("m");
  if (!slots.length) slots.push("h");
  return slots;
}

export function ranger(cases: Case[], format: Format, cartes: Carte[], avecVariantes = false): Case[] {
  const visuelsPlaces = cases
    .map((e, i) => (e && e.t === "i" ? { i, e } : null))
    .filter((v): v is { i: number; e: CaseVisuel } => v !== null);

  const ordre = [...cartes].sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0));
  // Alterné carte par carte : normale/reverse/pokéball/masterball de la
  // carte n avant la normale de la carte n+1 (garde l'ordre des numéros).
  const emplacements: { id: string; variante?: VarianteCarte }[] = avecVariantes
    ? ordre.flatMap((c) => slotsPourCarte(c).map((variante) => ({ id: c.id, variante })))
    : ordre.map((c) => ({ id: c.id }));

  const pages = Math.max(2, Math.ceil(Math.max(emplacements.length, cases.length) / parPage(format)));
  const next: Case[] = new Array(pages * parPage(format)).fill(null);

  visuelsPlaces.forEach(({ i, e }) => {
    if (i < next.length) next[i] = e;
  });

  let k = 0;
  for (const emp of emplacements) {
    while (k < next.length && next[k]) k++;
    if (k >= next.length) break;
    next[k] = { t: "c", id: emp.id, variante: emp.variante };
  }
  return next;
}

export function changerFormat(cases: Case[], nouveauFormat: Format): Case[] {
  const gardees = cases
    .filter((e): e is Exclude<Case, null> => e !== null)
    .map((e) => (e.t === "i" ? { ...e, w: Math.min(e.w, nouveauFormat), h: Math.min(e.h, nouveauFormat) } : e));

  const pages = Math.max(2, Math.ceil(gardees.length / (nouveauFormat * nouveauFormat)));
  const next: Case[] = new Array(pages * nouveauFormat * nouveauFormat).fill(null);
  gardees.forEach((e, i) => {
    next[i] = e;
  });
  return next;
}

export function ajouterPages(cases: Case[], format: Format): Case[] {
  return [...cases, ...new Array(parPage(format) * 2).fill(null)];
}

export function mettreAJourCase(cases: Case[], indice: number, patch: Partial<CaseVisuel>): Case[] {
  const courant = cases[indice];
  if (!courant || courant.t !== "i") return cases;
  const next = [...cases];
  next[indice] = { ...courant, ...patch };
  return next;
}
